"""Layer 3 — Decision Sandbox Service.

CRITICAL: This module contains ZERO LLM calls. All logic is pure Python math.

Responsibilities:
  1. Fetch pending outflow obligations for a business from Supabase.
  2. Auto-infer flexibility for any obligation whose flexibility is not set.
  3. Score each obligation: score = (penalty_rate * amount) / flexibility_factor[flexibility].
  4. Generate three deterministic pay/defer scenarios (A, B, C).
  5. Compute days_to_zero_delta and total_penalty_if_deferred for each scenario.

Scoring rationale:
  - Higher score → pay first.
  - flexibility_factor: none=0.1, medium=1.0, high=3.0
    Low flexibility → small divisor → high score → must pay urgently.
  - Sorting descending by score gives the greedy-optimal order.
"""

from datetime import date

from core.supabase_client import get_supabase
from models.decision_models import DecideRequest, DecideResponse, Obligation, Scenario
from utils.flexibility import auto_infer_flexibility

# Divisors per flexibility level — lower flexibility → higher priority score
_FLEXIBILITY_FACTOR: dict[str, float] = {
    "none": 0.1,
    "medium": 1.0,
    "high": 3.0,
}

# Minimum penalty rate used when penalty_rate is 0 (avoids zero-score for mandatory bills)
_MIN_PENALTY_RATE = 0.001


def _obligation_score(ob: Obligation) -> float:
    """Compute priority score for a single obligation.

    Formula: score = (penalty_rate * amount) / flexibility_factor[flexibility]

    A small epsilon is added to penalty_rate so that obligations with 0 declared
    penalty still get a meaningful score when flexibility is 'none'.

    Args:
        ob: Obligation to score.

    Returns:
        Float score — higher means pay first.
    """
    effective_rate = max(ob.penalty_rate, _MIN_PENALTY_RATE)
    factor = _FLEXIBILITY_FACTOR.get(ob.flexibility, 1.0)
    return (effective_rate * ob.amount) / factor


def _total_penalty(obligations: list[Obligation]) -> float:
    """Sum the estimated daily penalty cost for a list of deferred obligations.

    Penalty per obligation = penalty_rate * amount (one day's cost).

    Args:
        obligations: List of obligations assumed to be deferred.

    Returns:
        Total daily penalty float.
    """
    return sum(ob.penalty_rate * ob.amount for ob in obligations)


def _days_to_zero_delta(
    available_cash: float,
    baseline_obligations: list[Obligation],
    pay_list: list[Obligation],
) -> int:
    """Estimate how many additional days of runway the scenario buys.

    Compares the first day the running balance would go negative under the
    baseline (pay everything) against the scenario (only pay pay_list),
    both computed deterministically from due_date order.

    Args:
        available_cash: Current cash balance.
        baseline_obligations: All obligations sorted by due_date ascending.
        pay_list: Obligations the scenario decides to pay.

    Returns:
        Positive integer = extended runway; negative = worse than baseline; 0 = no change.
    """
    today = date.today()

    def first_zero(obligations: list[Obligation]) -> int | None:
        balance = available_cash
        for ob in sorted(obligations, key=lambda x: x.due_date):
            balance -= ob.amount
            if balance < 0:
                try:
                    tx_date = date.fromisoformat(ob.due_date)
                    return max(0, (tx_date - today).days)
                except ValueError:
                    return 0
        return None  # never goes negative

    baseline_zero = first_zero(baseline_obligations)
    scenario_zero = first_zero(pay_list)

    # None means infinite runway — treat as a large sentinel
    _INF = 9999
    b = baseline_zero if baseline_zero is not None else _INF
    s = scenario_zero if scenario_zero is not None else _INF
    return s - b


def _build_scenario_a(
    obligations: list[Obligation], available_cash: float
) -> Scenario:
    """Scenario A — Greedy Optimal.

    Sort all obligations by priority score descending.
    Pay obligations in order until cash runs out; defer the rest.
    'none'-flexibility obligations are always paid regardless of cash.

    Args:
        obligations: All scored obligations.
        available_cash: Cash available at decision time.

    Returns:
        Scenario with pay_list and defer_list.
    """
    sorted_obs = sorted(obligations, key=_obligation_score, reverse=True)
    pay_list: list[Obligation] = []
    defer_list: list[Obligation] = []
    remaining = available_cash

    for ob in sorted_obs:
        # Must-pay obligations go through even if it drives the balance negative
        if ob.flexibility == "none" or remaining >= ob.amount:
            pay_list.append(ob)
            remaining -= ob.amount
        else:
            defer_list.append(ob)

    delta = _days_to_zero_delta(available_cash, obligations, pay_list)
    penalty = _total_penalty(defer_list)
    return Scenario(
        pay_list=pay_list,
        defer_list=defer_list,
        days_to_zero_delta=delta,
        total_penalty_if_deferred=penalty,
    )


def _build_scenario_b(
    obligations: list[Obligation], available_cash: float
) -> Scenario:
    """Scenario B — Conservative.

    Pay all 'none'-flexibility obligations unconditionally.
    Defer everything with 'medium' or 'high' flexibility to preserve cash.

    Args:
        obligations: All obligations.
        available_cash: Cash available at decision time.

    Returns:
        Scenario with pay_list (only none-flexibility) and defer_list (everything else).
    """
    pay_list = [ob for ob in obligations if ob.flexibility == "none"]
    defer_list = [ob for ob in obligations if ob.flexibility != "none"]

    delta = _days_to_zero_delta(available_cash, obligations, pay_list)
    penalty = _total_penalty(defer_list)
    return Scenario(
        pay_list=pay_list,
        defer_list=defer_list,
        days_to_zero_delta=delta,
        total_penalty_if_deferred=penalty,
    )


def _build_scenario_c(
    obligations: list[Obligation], available_cash: float
) -> Scenario:
    """Scenario C — Custom (frontend toggle).

    Returns all obligations with include=True as the initial default
    (mirrors scenario_a's greedy recommendation).
    The frontend flips individual include flags; the backend re-scores on demand.

    Args:
        obligations: All obligations with include flags preset.
        available_cash: Cash available at decision time.

    Returns:
        Scenario where all obligations appear; pay_list contains include=True items.
    """
    # Default: mark as 'include' using the same greedy logic as scenario_a
    scenario_a = _build_scenario_a(obligations, available_cash)
    pay_ids = {ob.id for ob in scenario_a.pay_list}

    annotated: list[Obligation] = []
    for ob in obligations:
        annotated.append(ob.model_copy(update={"include": ob.id in pay_ids}))

    pay_list = [ob for ob in annotated if ob.include]
    defer_list = [ob for ob in annotated if not ob.include]

    delta = _days_to_zero_delta(available_cash, obligations, pay_list)
    penalty = _total_penalty(defer_list)
    return Scenario(
        pay_list=pay_list,
        defer_list=defer_list,
        days_to_zero_delta=delta,
        total_penalty_if_deferred=penalty,
    )


def run_decision_engine(request: DecideRequest) -> DecideResponse:
    """Fetch obligations from Supabase and generate three pay/defer scenarios.

    Args:
        request: DecideRequest with business_id.

    Returns:
        DecideResponse containing:
          - available_cash: Current cash balance.
          - scenario_a: Greedy Optimal (sorted by priority score).
          - scenario_b: Conservative (pay only none-flexibility obligations).
          - scenario_c: Custom (all obligations with include toggles for the frontend).

    Algorithm:
        1. Fetch current_cash_balance from businesses table.
        2. Fetch all pending outflow transactions.
        3. For each obligation, auto-infer flexibility if not already set.
        4. Build all three scenarios using deterministic greedy logic.
        5. Return DecideResponse with delta runway and penalty estimates.
    """
    supabase = get_supabase()

    # 1. Cash balance
    biz_result = (
        supabase.table("businesses")
        .select("current_cash_balance")
        .eq("id", request.business_id)
        .single()
        .execute()
    )
    available_cash: float = float(biz_result.data["current_cash_balance"])

    # 2. Pending outflow obligations
    tx_result = (
        supabase.table("transactions")
        .select("id, counterparty, amount, due_date, category, flexibility, penalty_rate")
        .eq("business_id", request.business_id)
        .eq("status", "pending")
        .eq("type", "outflow")
        .execute()
    )

    obligations: list[Obligation] = []
    for row in tx_result.data:
        # 3. Auto-infer flexibility if null/missing
        flex = row.get("flexibility") or auto_infer_flexibility(row.get("category", "misc"))
        obligations.append(
            Obligation(
                id=row["id"],
                counterparty=row["counterparty"],
                amount=float(row["amount"]),
                due_date=row["due_date"],
                category=row.get("category", "misc"),
                flexibility=flex,
                penalty_rate=float(row.get("penalty_rate") or 0.0),
            )
        )

    # 4–5. Build scenarios
    scenario_a = _build_scenario_a(obligations, available_cash)
    scenario_b = _build_scenario_b(obligations, available_cash)
    scenario_c = _build_scenario_c(obligations, available_cash)

    return DecideResponse(
        available_cash=available_cash,
        scenario_a=scenario_a,
        scenario_b=scenario_b,
        scenario_c=scenario_c,
    )

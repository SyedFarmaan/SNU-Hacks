"""Layer 3 — Decision Sandbox Service (Scenario Branching).

CRITICAL: This module contains ZERO LLM calls. All logic is pure Python math.

Implements three deterministic strategies:
  1. Baseline:  Pay every obligation on its due_date.
                 Penalties = 0; min_balance shows if cash would go negative.
  2. Survival:  Hoard cash — defer medium/high-flexibility items by 30 days,
                 pay only 'none'-flexibility items on time.
  3. Smart Penalty Minimization:
                 Day-by-day greedy simulation.  When cash runs short on a
                 given day, defer the highest-flexibility / lowest-penalty items
                 by 15 days (once per item) until the balance stays >= 0.

Each scenario returns: strategy name, human-readable actions list,
min_balance (lowest cash dip), total_penalties, and pay/defer obligation lists.

A recommendation engine picks the best strategy based on solvency + cost.
"""

from datetime import date, timedelta

from core.supabase_client import get_supabase
from models.decision_models import DecideRequest, DecideResponse, Obligation, Scenario
from utils.flexibility import auto_infer_flexibility

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Number of days each strategy defers obligations
_SURVIVAL_DEFER_DAYS = 30
_SMART_DEFER_DAYS = 15

# Flexibility divisors for the priority scoring heuristic (Smart strategy)
_FLEXIBILITY_FACTOR: dict[str, float] = {
    "none": 0.1,    # small divisor → high score → pay first
    "medium": 1.0,
    "high": 3.0,    # large divisor → low score → defer first
}

# Floor penalty rate so zero-penalty items still get a meaningful priority score
_MIN_PENALTY_RATE = 0.001

# Flexibility rank for deferral order (lower number = defer first)
_FLEX_DEFER_RANK: dict[str, int] = {"high": 0, "medium": 1, "none": 2}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _format_inr(amount: float) -> str:
    """Format a number with Indian comma grouping (e.g. 1,05,200)."""
    sign = "-" if amount < 0 else ""
    n = abs(round(amount))
    s = str(n)
    if len(s) <= 3:
        return f"{sign}{s}"
    last3 = s[-3:]
    rest = s[:-3]
    groups: list[str] = []
    while rest:
        groups.append(rest[-2:])
        rest = rest[:-2]
    groups.reverse()
    return f"{sign}{','.join(groups)},{last3}"


def _obligation_score(ob: Obligation) -> float:
    """Priority score: higher = more urgent to pay, lower = safer to defer.

    Formula: (max(penalty_rate, epsilon) * amount) / flexibility_factor

    'none' flexibility → small divisor → very high score → always pay first.
    'high' flexibility → large divisor → low score → defer candidate.
    """
    effective_rate = max(ob.penalty_rate, _MIN_PENALTY_RATE)
    factor = _FLEXIBILITY_FACTOR.get(ob.flexibility, 1.0)
    return (effective_rate * ob.amount) / factor


# ---------------------------------------------------------------------------
# Strategy 1: Baseline — Pay everything on its due date
# ---------------------------------------------------------------------------

def _build_baseline(obligations: list[Obligation], cash: float) -> Scenario:
    """Attempt to pay every obligation exactly on its due_date.

    Total penalties are always 0 (nothing is late).  min_balance may go
    negative if cash is insufficient — that's the point: it shows the raw
    cash position without any optimisation.

    Args:
        obligations: All pending outflow obligations.
        cash: Starting cash balance.

    Returns:
        Scenario named "Baseline".
    """
    # Sort chronologically so the cash walk is in due-date order
    sorted_obs = sorted(obligations, key=lambda ob: ob.due_date)

    balance = cash
    min_balance = cash
    actions: list[str] = []

    for ob in sorted_obs:
        balance -= ob.amount
        min_balance = min(min_balance, balance)
        actions.append(
            f"Pay {ob.counterparty} ₹{_format_inr(ob.amount)} on {ob.due_date}"
        )

    return Scenario(
        name="Baseline",
        actions=actions,
        min_balance=round(min_balance, 2),
        total_penalties=0.0,
        pay_list=sorted_obs,
        defer_list=[],
    )


# ---------------------------------------------------------------------------
# Strategy 2: Survival — Hoard cash, pay only mandatory items
# ---------------------------------------------------------------------------

def _build_survival(obligations: list[Obligation], cash: float) -> Scenario:
    """Maximise runway by deferring all medium/high-flexibility items by 30 days.

    Only 'none'-flexibility obligations are paid on their original due date.
    Deferred items accrue penalties over the deferral window:
        penalty = penalty_rate × amount × 30 days

    Args:
        obligations: All pending outflow obligations.
        cash: Starting cash balance.

    Returns:
        Scenario named "Survival".
    """
    pay_now: list[Obligation] = []
    deferred: list[Obligation] = []
    actions: list[str] = []
    total_penalties = 0.0

    # ── Categorise: pay mandatory items, defer the rest ──
    for ob in obligations:
        if ob.flexibility == "none":
            pay_now.append(ob)
        else:
            deferred.append(ob)
            penalty = ob.penalty_rate * ob.amount * _SURVIVAL_DEFER_DAYS
            total_penalties += penalty
            new_date = (
                date.fromisoformat(ob.due_date)
                + timedelta(days=_SURVIVAL_DEFER_DAYS)
            ).isoformat()
            actions.append(
                f"Deferred {ob.counterparty} ₹{_format_inr(ob.amount)} "
                f"by {_SURVIVAL_DEFER_DAYS} days to {new_date}"
            )

    # ── Build timeline: originals at their dates, deferred at new dates ──
    # Each entry is (date_obj, amount_to_subtract)
    timeline: list[tuple[date, float]] = []
    for ob in sorted(pay_now, key=lambda o: o.due_date):
        timeline.append((date.fromisoformat(ob.due_date), ob.amount))
        actions.append(
            f"Pay {ob.counterparty} ₹{_format_inr(ob.amount)} on {ob.due_date}"
        )
    for ob in deferred:
        new_dt = date.fromisoformat(ob.due_date) + timedelta(days=_SURVIVAL_DEFER_DAYS)
        timeline.append((new_dt, ob.amount))

    # Sort combined timeline chronologically
    timeline.sort(key=lambda x: x[0])

    # ── Walk the timeline to find the lowest cash point ──
    balance = cash
    min_balance = cash
    for _, amount in timeline:
        balance -= amount
        min_balance = min(min_balance, balance)

    return Scenario(
        name="Survival",
        actions=actions,
        min_balance=round(min_balance, 2),
        total_penalties=round(total_penalties, 2),
        pay_list=sorted(pay_now, key=lambda ob: ob.due_date),
        defer_list=deferred,
    )


# ---------------------------------------------------------------------------
# Strategy 3: Smart Penalty Minimization — Greedy day-by-day deferral
# ---------------------------------------------------------------------------

def _build_smart(obligations: list[Obligation], cash: float) -> Scenario:
    """Day-by-day greedy simulation with selective deferral.

    Algorithm:
      1. Queue all obligations by due_date.
      2. On each calendar date that has obligations due:
         a. Sum everything due that day.
         b. If cash covers it → pay all.
         c. If not → identify deferral candidates, sorted by:
            - Highest flexibility first  (high → medium → none)
            - Lowest penalty cost first  (cheapest to defer)
            Defer items one-by-one until balance would stay >= 0.
            'none'-flexibility items are NEVER deferred.
            Each obligation can be deferred at most once.
      3. Deferred items re-enter the queue at original_date + 15 days.
      4. Penalty per deferral = penalty_rate × amount × 15 days.

    Args:
        obligations: All pending outflow obligations.
        cash: Starting cash balance.

    Returns:
        Scenario named "Smart Penalty Minimization".
    """
    # ── Queue entries: (date_str, obligation, times_already_deferred) ──
    queue: list[tuple[str, Obligation, int]] = [
        (ob.due_date, ob, 0) for ob in obligations
    ]

    balance = cash
    min_balance = cash
    total_penalties = 0.0
    pay_list: list[Obligation] = []       # Paid at original date (never deferred)
    defer_list: list[Obligation] = []     # Deferred at least once
    deferred_ids: set[str] = set()        # Quick membership check
    actions: list[str] = []

    # Safety bound: each obligation enters at most twice (original + 1 deferral)
    max_iterations = len(obligations) * 3

    for _ in range(max_iterations):
        if not queue:
            break

        # Sort so we always process the earliest date first
        queue.sort(key=lambda x: x[0])
        current_date_str = queue[0][0]

        # ── Partition: items due today vs. items due later ──
        today_items: list[tuple[Obligation, int]] = []
        rest: list[tuple[str, Obligation, int]] = []
        for date_str, ob, dc in queue:
            if date_str == current_date_str:
                today_items.append((ob, dc))
            else:
                rest.append((date_str, ob, dc))

        # ── Check if we can afford everything due today ──
        total_due = sum(ob.amount for ob, _ in today_items)

        if balance - total_due >= 0:
            # ── Sufficient cash: pay all items due today ──
            for ob, _dc in today_items:
                balance -= ob.amount
                # Only add to pay_list if this item was never deferred
                if ob.id not in deferred_ids:
                    pay_list.append(ob)
                actions.append(
                    f"Pay {ob.counterparty} ₹{_format_inr(ob.amount)} "
                    f"on {current_date_str}"
                )
        else:
            # ── Insufficient cash: selectively defer the cheapest items ──
            #
            # Deferral priority (lower tuple sorts first → deferred first):
            #   Primary:   highest flexibility (high=0 < medium=1 < none=2)
            #   Secondary: lowest penalty cost  (penalty_rate × amount ASC)
            deferral_sorted = sorted(
                today_items,
                key=lambda x: (
                    _FLEX_DEFER_RANK.get(x[0].flexibility, 1),
                    x[0].penalty_rate * x[0].amount,
                ),
            )

            # Walk through candidates and defer until we fit the budget
            ids_to_defer: set[str] = set()
            running_cost = total_due

            for ob, dc in deferral_sorted:
                if balance - running_cost >= 0:
                    break  # We now have enough cash
                if ob.flexibility == "none":
                    continue  # Never defer mandatory obligations
                if dc >= 1:
                    continue  # Already deferred once — must pay now
                # Defer this obligation
                running_cost -= ob.amount
                ids_to_defer.add(ob.id)

            # ── Pay everything NOT being deferred ──
            for ob, _dc in today_items:
                if ob.id not in ids_to_defer:
                    balance -= ob.amount
                    if ob.id not in deferred_ids:
                        pay_list.append(ob)
                    actions.append(
                        f"Pay {ob.counterparty} ₹{_format_inr(ob.amount)} "
                        f"on {current_date_str}"
                    )

            # ── Process the deferrals: re-queue at +15 days ──
            for ob, dc in today_items:
                if ob.id in ids_to_defer:
                    new_date = (
                        date.fromisoformat(current_date_str)
                        + timedelta(days=_SMART_DEFER_DAYS)
                    ).isoformat()
                    penalty = ob.penalty_rate * ob.amount * _SMART_DEFER_DAYS
                    total_penalties += penalty
                    deferred_ids.add(ob.id)
                    defer_list.append(ob)
                    rest.append((new_date, ob, dc + 1))

                    action_str = (
                        f"Deferred {ob.counterparty} ₹{_format_inr(ob.amount)} "
                        f"by {_SMART_DEFER_DAYS} days to {new_date}"
                    )
                    if penalty > 0:
                        action_str += f" (penalty: ₹{_format_inr(penalty)})"
                    actions.append(action_str)

        # Track the lowest balance after processing this date
        min_balance = min(min_balance, balance)
        queue = rest

    return Scenario(
        name="Smart Penalty Minimization",
        actions=actions,
        min_balance=round(min_balance, 2),
        total_penalties=round(total_penalties, 2),
        pay_list=pay_list,
        defer_list=defer_list,
    )


# ---------------------------------------------------------------------------
# Recommendation engine
# ---------------------------------------------------------------------------

def _recommend(scenarios: list[Scenario]) -> str:
    """Pick the best strategy from the evaluated set.

    Logic:
      1. Filter to "viable" strategies whose min_balance >= 0 (never go negative).
      2. Among viable strategies, pick the one with the lowest total_penalties.
      3. If ALL strategies drop below zero, pick the one with the highest
         min_balance (least-bad outcome).

    Args:
        scenarios: List of Scenario objects to compare.

    Returns:
        Name of the winning strategy.
    """
    # Viable = balance never goes negative
    viable = [s for s in scenarios if s.min_balance >= 0]

    if viable:
        # Best viable: lowest penalty cost
        return min(viable, key=lambda s: s.total_penalties).name

    # All strategies go negative — pick the least-bad one
    return max(scenarios, key=lambda s: s.min_balance).name


# ---------------------------------------------------------------------------
# Main entry point (called by the controller)
# ---------------------------------------------------------------------------

def run_decision_engine(request: DecideRequest) -> DecideResponse:
    """Fetch obligations from Supabase and simulate three deterministic scenarios.

    Steps:
      1. Fetch current_cash_balance from businesses table.
      2. Fetch all pending outflow transactions.
      3. Auto-infer flexibility for obligations that don't have one.
      4. Run all three strategies against the same obligation set.
      5. Recommend the best strategy.

    Args:
        request: DecideRequest with business_id.

    Returns:
        DecideResponse with three scenarios and a recommendation.
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
        flex = row.get("flexibility") or auto_infer_flexibility(
            row.get("category", "misc")
        )
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

    # 4. Build all three scenarios
    baseline = _build_baseline(obligations, available_cash)
    survival = _build_survival(obligations, available_cash)
    smart = _build_smart(obligations, available_cash)

    # 5. Recommend the best strategy
    recommended = _recommend([baseline, survival, smart])

    return DecideResponse(
        available_cash=available_cash,
        scenario_a=baseline,
        scenario_b=survival,
        scenario_c=smart,
        recommended_scenario=recommended,
    )

"""Layer 2 — Runway Detection Service.

CRITICAL: This module contains ZERO LLM calls. All logic is pure Python math.

Responsibilities:
  1. Fetch current cash balance and all pending/overdue transactions from Supabase.
  2. Walk the transaction timeline chronologically and compute running balance.
  3. Detect the first day the balance goes negative (days_to_zero).
  4. Compute burn rates (gross and net monthly burn).
  5. Compute cash coverage days and runway months from burn rates.
  6. Snapshot the projected balance at 7, 30, and 60-day horizons.
  7. Compute overdue receivables %, overdue payables %, and penalty payables %.
  8. Compute cash flow volatility (std dev) and counterparty concentration risk.
  9. Compute a deterministic financial health score (0–100).
"""

import math
from collections import defaultdict
from datetime import date, timedelta

from core.supabase_client import get_supabase
from models.runway_models import RunwayRequest, RunwayResponse, TimelineEntry

# ---------------------------------------------------------------------------
# Health score lookup tables
# ---------------------------------------------------------------------------

# Runway component: maps days_to_zero to a score (max 50 pts)
_DAYS_SCORE_TABLE: list[tuple[float, int]] = [
    (0,            0),   # already at zero
    (7,           10),   # 1–7 days
    (14,          20),   # 8–14 days
    (30,          30),   # 15–30 days
    (60,          40),   # 31–60 days
    (float("inf"), 50),  # 61+ days → full component
]

# Stress component: maps (total_payables / (cash + receivables)) to score (max 30 pts)
_STRESS_SCORE_TABLE: list[tuple[float, int]] = [
    (0.25, 30),
    (0.50, 22),
    (0.75, 14),
    (1.00,  7),
    (float("inf"), 0),
]

# Overdue pressure component: maps overdue_payables_pct to score (max 20 pts)
_OVERDUE_SCORE_TABLE: list[tuple[float, int]] = [
    (0.00, 20),  # no overdue payables → full 20 pts
    (0.10, 16),
    (0.25, 10),
    (0.50,  4),
    (float("inf"), 0),
]


def _score_from_table(value: float, table: list[tuple[float, int]]) -> int:
    """Map a numeric value to a score using a step-down lookup table.

    Args:
        value: The metric to evaluate.
        table: List of (threshold, score) pairs sorted ascending by threshold.
               Returns the score for the first threshold >= value.

    Returns:
        Integer score component.
    """
    for threshold, score in table:
        if value <= threshold:
            return score
    return 0


def compute_health_score(
    days_to_zero: int | None,
    stress_ratio: float,
    overdue_payables_pct: float,
) -> int:
    """Compute a deterministic financial health score between 0 and 100.

    Formula:
        score = runway_component (max 50)
              + stress_component (max 30)
              + overdue_pressure_component (max 20)

    Args:
        days_to_zero: First day balance goes negative, or None if always positive.
        stress_ratio: total_payables / (cash + receivables).
        overdue_payables_pct: Fraction of payables that are currently overdue (0–1).

    Returns:
        Integer health score 0–100.
    """
    runway_component = (
        50 if days_to_zero is None
        else _score_from_table(float(days_to_zero), _DAYS_SCORE_TABLE)
    )
    stress_component = _score_from_table(stress_ratio, _STRESS_SCORE_TABLE)
    overdue_component = _score_from_table(overdue_payables_pct, _OVERDUE_SCORE_TABLE)
    return min(100, runway_component + stress_component + overdue_component)


def _std_dev(values: list[float]) -> float:
    """Compute population standard deviation of a list of floats.

    Returns 0.0 for lists with fewer than 2 elements (no variance measureable).
    """
    n = len(values)
    if n < 2:
        return 0.0
    mean = sum(values) / n
    variance = sum((v - mean) ** 2 for v in values) / n
    return math.sqrt(variance)


def _horizon_balance(
    running_balance: float,
    timeline: list[TimelineEntry],
    today: date,
    horizon_days: int,
) -> float:
    """Return the projected balance at `today + horizon_days`.

    Uses the last timeline entry with a date <= cutoff date. If no entries
    fall before the cutoff, returns the current running balance unchanged
    (no transactions within that window).

    Args:
        running_balance: Starting cash balance before any timeline entries.
        timeline: Chronological list of TimelineEntry objects already built.
        today: Reference date for computing the horizon.
        horizon_days: Number of days ahead to project.

    Returns:
        Projected cash balance (float) at the horizon date.
    """
    cutoff = today + timedelta(days=horizon_days)
    result = running_balance  # default: no transactions within window
    # Timeline is already sorted ascending by date
    for entry in timeline:
        if entry.date <= cutoff:
            result = entry.balance
        else:
            break
    return result


def compute_runway(request: RunwayRequest) -> RunwayResponse:
    """Compute the full Tier 1 cash-flow runway metrics for a business.

    Args:
        request: RunwayRequest containing the business_id to analyse.

    Returns:
        RunwayResponse with all Tier 1 deterministic metrics.

    Algorithm:
        1. Fetch current_cash_balance from businesses table.
        2. Fetch all pending transactions sorted ascending by due_date.
        3. Fetch all overdue transactions (for overdue % computations).
        4. Walk the pending timeline: accumulate running balance, track min,
           record first negative crossing (days_to_zero).
        5. Snapshot the balance at T+7, T+30, T+60 from the timeline.
        6. Compute gross and net monthly burn rates by bucketing transactions
           into calendar months.
        7. Derive cash_coverage_days and runway_months from burn rates.
        8. Compute overdue receivables %, overdue payables %, penalty payables %.
        9. Compute cash flow volatility (std dev of amounts) and counterparty
           concentration risk (max exposure / total exposure).
        10. Compute health score from (days_to_zero, stress_ratio, overdue_payables_pct).
    """
    supabase = get_supabase()
    today = date.today()

    # 1. Fetch business cash balance
    biz_result = (
        supabase.table("businesses")
        .select("current_cash_balance")
        .eq("id", request.business_id)
        .single()
        .execute()
    )
    current_cash: float = float(biz_result.data["current_cash_balance"])

    # 2. Fetch pending transactions sorted by due_date ascending
    tx_result = (
        supabase.table("transactions")
        .select("counterparty, amount, due_date, type, penalty_rate, category")
        .eq("business_id", request.business_id)
        .eq("status", "pending")
        .order("due_date", desc=False)
        .execute()
    )
    pending_txs: list[dict] = tx_result.data

    # 3. Fetch overdue transactions (status=overdue) for overdue % metrics
    overdue_result = (
        supabase.table("transactions")
        .select("amount, type, category")
        .eq("business_id", request.business_id)
        .eq("status", "overdue")
        .execute()
    )
    overdue_txs: list[dict] = overdue_result.data

    # --- 4. Walk pending timeline ---
    running_balance = current_cash
    days_to_zero: int | None = None
    timeline: list[TimelineEntry] = []
    total_payables = 0.0
    total_receivables = 0.0
    min_balance = current_cash

    # For burn rate: bucket amounts by (year, month)
    monthly_outflows: dict[tuple[int, int], float] = defaultdict(float)
    monthly_inflows: dict[tuple[int, int], float] = defaultdict(float)

    # For concentration risk: total exposure per counterparty
    counterparty_exposure: dict[str, float] = defaultdict(float)

    # All transaction amounts for volatility computation
    all_amounts: list[float] = []

    # For penalty payables
    total_pending_payable_amount = 0.0
    penalty_payable_amount = 0.0

    for tx in pending_txs:
        tx_date = date.fromisoformat(tx["due_date"])
        amount = float(tx["amount"])
        month_key = (tx_date.year, tx_date.month)
        counterparty: str = tx["counterparty"]

        if tx["type"] == "outflow":
            running_balance -= amount
            total_payables += amount
            monthly_outflows[month_key] += amount
            counterparty_exposure[counterparty] += amount
            # Penalty tracking: payables only
            total_pending_payable_amount += amount
            penalty_rate = float(tx.get("penalty_rate") or 0)
            if penalty_rate > 0:
                penalty_payable_amount += amount
        else:
            running_balance += amount
            total_receivables += amount
            monthly_inflows[month_key] += amount

        all_amounts.append(amount)

        timeline.append(
            TimelineEntry(
                date=tx_date,
                balance=running_balance,
                counterparty=counterparty,
                transaction_type=tx["type"],
                amount=amount,
            )
        )

        # First negative crossing → record days_to_zero
        if running_balance < 0 and days_to_zero is None:
            days_to_zero = max(0, (tx_date - today).days)

        if running_balance < min_balance:
            min_balance = running_balance

    # 5. Horizon snapshots
    starting_balance_for_horizons = current_cash
    cash_at_7d = _horizon_balance(starting_balance_for_horizons, timeline, today, 7)
    cash_at_30d = _horizon_balance(starting_balance_for_horizons, timeline, today, 30)
    cash_at_60d = _horizon_balance(starting_balance_for_horizons, timeline, today, 60)

    # 6. Burn rates
    # Span is the number of distinct calendar months that have any transaction
    all_months = set(monthly_outflows.keys()) | set(monthly_inflows.keys())
    month_span = max(1, len(all_months))  # always at least 1 to avoid division by zero

    gross_burn_monthly = sum(monthly_outflows.values()) / month_span
    net_burn_monthly = (
        sum(monthly_outflows.values()) - sum(monthly_inflows.values())
    ) / month_span

    # 7. Derived rate metrics
    avg_daily_outflow = gross_burn_monthly / 30.0
    cash_coverage_days: float | None = (
        current_cash / avg_daily_outflow if avg_daily_outflow > 0 else None
    )
    runway_months: float | None = (
        current_cash / net_burn_monthly if net_burn_monthly > 0 else None
    )

    # 8. Overdue pressure metrics
    overdue_receivable_amount = sum(
        float(t["amount"]) for t in overdue_txs
        if t["type"] == "inflow"
    )
    overdue_payable_amount = sum(
        float(t["amount"]) for t in overdue_txs
        if t["type"] == "outflow"
    )
    total_all_receivables = total_receivables + overdue_receivable_amount
    total_all_payables = total_payables + overdue_payable_amount

    overdue_receivables_pct = (
        overdue_receivable_amount / total_all_receivables
        if total_all_receivables > 0 else 0.0
    )
    overdue_payables_pct = (
        overdue_payable_amount / total_all_payables
        if total_all_payables > 0 else 0.0
    )
    penalty_payables_pct = (
        penalty_payable_amount / total_pending_payable_amount
        if total_pending_payable_amount > 0 else 0.0
    )

    # 9. Volatility and concentration risk
    cash_flow_volatility = _std_dev(all_amounts)

    total_exposure = sum(counterparty_exposure.values())
    counterparty_concentration_risk: float = (
        max(counterparty_exposure.values()) / total_exposure
        if total_exposure > 0 else 0.0
    )

    # Stress ratio for health score
    cash_and_receivables = current_cash + total_receivables
    if cash_and_receivables <= 0:
        stress_ratio = float("inf") if total_payables > 0 else 0.0
    else:
        stress_ratio = total_payables / cash_and_receivables

    # 10. Health score
    health_score = compute_health_score(days_to_zero, stress_ratio, overdue_payables_pct)

    # Liquidity gap
    liquidity_gap = abs(min_balance) if min_balance < 0 else 0.0

    return RunwayResponse(
        days_to_zero=days_to_zero,
        min_balance=min_balance,
        liquidity_gap=liquidity_gap,
        gross_burn_monthly=gross_burn_monthly,
        net_burn_monthly=net_burn_monthly,
        cash_coverage_days=cash_coverage_days,
        runway_months=runway_months,
        cash_at_7d=cash_at_7d,
        cash_at_30d=cash_at_30d,
        cash_at_60d=cash_at_60d,
        overdue_receivables_pct=round(overdue_receivables_pct, 4),
        overdue_payables_pct=round(overdue_payables_pct, 4),
        penalty_payables_pct=round(penalty_payables_pct, 4),
        cash_flow_volatility=round(cash_flow_volatility, 2),
        counterparty_concentration_risk=round(counterparty_concentration_risk, 4),
        health_score=health_score,
        total_payables=total_payables,
        total_receivables=total_receivables,
        current_cash_balance=current_cash,
        timeline=timeline,
    )

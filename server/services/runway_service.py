"""Layer 2 — Runway Detection Service.

CRITICAL: This module contains ZERO LLM calls. All logic is pure Python math.

Responsibilities:
  1. Fetch current cash balance and pending transactions from Supabase.
  2. Walk the transaction timeline chronologically and compute running balance.
  3. Detect the first day the balance goes negative (days_to_zero).
  4. Compute a deterministic financial health score (0–100).
  5. Compute the liquidity gap (total obligations that cannot be covered).
"""

from datetime import date

from core.supabase_client import get_supabase
from models.runway_models import RunwayRequest, RunwayResponse, TimelineEntry

# Health score thresholds (days_to_zero → score contribution).
# Table sorted ascending by threshold; _score_from_table returns the first score
# where value <= threshold.  Values beyond the last finite threshold still get 60.
_DAYS_SCORE_TABLE = [
    (0,            0),   # days == 0   → 0 pts (already at zero)
    (7,           10),   # 1–7 days    → 10 pts
    (14,          20),   # 8–14 days   → 20 pts
    (30,          35),   # 15–30 days  → 35 pts
    (60,          50),   # 31–60 days  → 50 pts
    (float("inf"), 60),  # 61+ days    → 60 pts
]

# Stress ratio thresholds (total_payables / (cash + receivables) → score contribution)
_STRESS_SCORE_TABLE = [
    (0.25, 40),  # stress ratio ≤ 0.25 → 40 points
    (0.50, 30),
    (0.75, 20),
    (1.00, 10),
    (float("inf"), 0),
]


def _score_from_table(value: float, table: list[tuple[float, int]]) -> int:
    """Map a numeric value to a score using a step-down lookup table.

    Args:
        value: The metric to evaluate (e.g. days_to_zero or stress_ratio).
        table: List of (threshold, score) pairs sorted ascending by threshold.
               Returns the score for the first threshold >= value.

    Returns:
        Integer score component.
    """
    for threshold, score in table:
        if value <= threshold:
            return score
    return 0


def compute_health_score(days_to_zero: int | None, stress_ratio: float) -> int:
    """Compute a deterministic financial health score between 0 and 100.

    Formula:
        score = runway_component + stress_component

    Components:
        runway_component — derived from days_to_zero using a step table (max 60 pts).
            If days_to_zero is None (balance never goes negative), full 60 pts awarded.
        stress_component — derived from stress_ratio = total_payables / (cash + receivables).
            Lower ratio (more coverage) → higher score (max 40 pts).

    Args:
        days_to_zero: First day the running balance goes negative, or None if healthy.
        stress_ratio: total_payables / (current_cash + total_receivables). Clamped to 0 if
                      denominator is 0 (no cash and no receivables → worst case).

    Returns:
        Integer health score 0–100.
    """
    if days_to_zero is None:
        runway_component = 60
    else:
        runway_component = _score_from_table(float(days_to_zero), _DAYS_SCORE_TABLE)

    stress_component = _score_from_table(stress_ratio, _STRESS_SCORE_TABLE)
    return min(100, runway_component + stress_component)


def compute_runway(request: RunwayRequest) -> RunwayResponse:
    """Compute the cash-flow runway for a business.

    Args:
        request: RunwayRequest containing the business_id to analyse.

    Returns:
        RunwayResponse with:
          - days_to_zero: First day balance goes negative (None if always positive).
          - health_score: Deterministic 0–100 score.
          - timeline: Chronological list of TimelineEntry objects for chart rendering.
          - liquidity_gap: Total obligations not coverable by available funds.
          - total_payables: Sum of all pending outflows.
          - total_receivables: Sum of all pending inflows.
          - current_cash_balance: Cash balance at time of calculation.

    Algorithm:
        1. Fetch current_cash_balance from businesses table.
        2. Fetch all pending transactions sorted ascending by due_date.
        3. Walk the timeline: add inflows, subtract outflows, track running balance.
        4. Record the first date where running_balance < 0 as days_to_zero.
        5. Compute stress_ratio = total_payables / max(1, cash + receivables).
        6. Pass days_to_zero and stress_ratio into compute_health_score.
        7. liquidity_gap = absolute value of the minimum running balance (if < 0).
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
        .select("counterparty, amount, due_date, type")
        .eq("business_id", request.business_id)
        .eq("status", "pending")
        .order("due_date", desc=False)
        .execute()
    )
    transactions = tx_result.data  # list of dicts

    # 3. Walk timeline
    running_balance = current_cash
    days_to_zero: int | None = None
    timeline: list[TimelineEntry] = []
    total_payables = 0.0
    total_receivables = 0.0
    min_balance = current_cash  # track the lowest point for liquidity gap

    for tx in transactions:
        tx_date = date.fromisoformat(tx["due_date"])
        amount = float(tx["amount"])

        if tx["type"] == "outflow":
            running_balance -= amount
            total_payables += amount
        else:
            running_balance += amount
            total_receivables += amount

        timeline.append(
            TimelineEntry(
                date=tx_date,
                balance=running_balance,
                counterparty=tx["counterparty"],
                transaction_type=tx["type"],
                amount=amount,
            )
        )

        # 4. First time balance goes negative → record days_to_zero
        if running_balance < 0 and days_to_zero is None:
            days_to_zero = max(0, (tx_date - today).days)

        if running_balance < min_balance:
            min_balance = running_balance

    # 5. Stress ratio: how much cash + receivables covers payables
    cash_and_receivables = current_cash + total_receivables
    if cash_and_receivables <= 0:
        # No liquidity at all → worst-case ratio
        stress_ratio = float("inf") if total_payables > 0 else 0.0
    else:
        stress_ratio = total_payables / cash_and_receivables

    # 6. Health score
    health_score = compute_health_score(days_to_zero, stress_ratio)

    # 7. Liquidity gap: obligations that cannot be covered
    liquidity_gap = abs(min_balance) if min_balance < 0 else 0.0

    return RunwayResponse(
        days_to_zero=days_to_zero,
        health_score=health_score,
        timeline=timeline,
        liquidity_gap=liquidity_gap,
        total_payables=total_payables,
        total_receivables=total_receivables,
        current_cash_balance=current_cash,
    )

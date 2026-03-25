"""Pydantic models for Layer 2 — Runway Detection.

RunwayResponse is the single output contract for the /api/runway endpoint.
All fields are deterministic; no LLM values are present here.
"""

from datetime import date
from pydantic import BaseModel, Field


class RunwayRequest(BaseModel):
    """Input to Layer 2: identifies which business to analyse."""

    business_id: str = Field(..., description="UUID of the business in Supabase")


class TimelineEntry(BaseModel):
    """A single point on the cash-flow timeline, one entry per pending transaction."""

    date: date
    balance: float = Field(..., description="Running cash balance in INR after this transaction")
    counterparty: str
    transaction_type: str = Field(..., description="'inflow' or 'outflow'")
    amount: float


class RunwayResponse(BaseModel):
    """Output of Layer 2: full deterministic runway and liquidity health metrics.

    Fields are grouped by concern:
      - Survival:     days_to_zero, min_balance, liquidity_gap
      - Burn:         gross_burn_monthly, net_burn_monthly, cash_coverage_days, runway_months
      - Horizons:     cash_at_7d, cash_at_30d, cash_at_60d
      - Pressure:     overdue_receivables_pct, overdue_payables_pct, penalty_payables_pct
      - Risk:         cash_flow_volatility, counterparty_concentration_risk
      - Summary:      health_score, total_payables, total_receivables, current_cash_balance
      - Chart:        timeline
    """

    # --- Survival metrics ---
    days_to_zero: int | None = Field(
        None,
        description="Days until running balance first goes negative; None if balance stays positive",
    )
    min_balance: float = Field(
        ...,
        description="Lowest projected cash balance across the entire transaction timeline (INR)",
    )
    liquidity_gap: float = Field(
        ..., ge=0,
        description="Obligations that cannot be covered: abs(min_balance) if min_balance < 0, else 0",
    )

    # --- Burn rate metrics ---
    gross_burn_monthly: float = Field(
        ..., ge=0,
        description="Average monthly outflows in INR (total outflows / months spanned, min 1 month)",
    )
    net_burn_monthly: float = Field(
        ...,
        description="Average monthly net cash change (outflows - inflows). Positive = burning cash.",
    )
    cash_coverage_days: float | None = Field(
        None,
        description="Days current cash covers daily outflow rate. None if no outflows.",
    )
    runway_months: float | None = Field(
        None,
        description="Months until cash runs out at current net burn. None if net_burn_monthly <= 0.",
    )

    # --- Horizon snapshots ---
    cash_at_7d: float = Field(..., description="Projected balance 7 days from today (INR)")
    cash_at_30d: float = Field(..., description="Projected balance 30 days from today (INR)")
    cash_at_60d: float = Field(..., description="Projected balance 60 days from today (INR)")

    # --- Obligation pressure ---
    overdue_receivables_pct: float = Field(
        ..., ge=0.0, le=1.0,
        description="Fraction of total receivable amount that is currently overdue (0–1)",
    )
    overdue_payables_pct: float = Field(
        ..., ge=0.0, le=1.0,
        description="Fraction of total payable amount that is currently overdue (0–1)",
    )
    penalty_payables_pct: float = Field(
        ..., ge=0.0, le=1.0,
        description="Fraction of pending payables (by amount) that carry a late-payment penalty rate > 0",
    )

    # --- Risk metrics ---
    cash_flow_volatility: float = Field(
        ..., ge=0,
        description="Standard deviation of transaction amounts across the pending timeline (INR)",
    )
    counterparty_concentration_risk: float = Field(
        ..., ge=0.0, le=1.0,
        description="Largest single counterparty exposure / total exposure (0–1). 1.0 = 100% concentration.",
    )

    # --- Summary ---
    health_score: int = Field(
        ..., ge=0, le=100,
        description="Composite financial health score 0–100 (runway + stress + overdue pressure)",
    )
    total_payables: float = Field(..., ge=0, description="Sum of all pending outflow amounts (INR)")
    total_receivables: float = Field(..., ge=0, description="Sum of all pending inflow amounts (INR)")
    current_cash_balance: float = Field(..., description="Current cash balance at time of calculation (INR)")

    # --- Chart data ---
    timeline: list[TimelineEntry] = Field(
        ..., description="Chronological cash-flow entries for the frontend chart"
    )

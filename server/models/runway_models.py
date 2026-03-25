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
    """Output of Layer 2: deterministic runway and health metrics."""

    days_to_zero: int | None = Field(
        None,
        description="Days until running balance first goes negative; None if balance stays positive",
    )
    health_score: int = Field(
        ..., ge=0, le=100,
        description="Financial health score 0–100 derived from days_to_zero and stress_ratio",
    )
    timeline: list[TimelineEntry] = Field(
        ..., description="Chronological cash-flow entries for the chart"
    )
    liquidity_gap: float = Field(
        ..., ge=0,
        description="Sum of obligations that cannot be covered by available cash + receivables",
    )
    total_payables: float = Field(..., ge=0, description="Sum of all pending outflow amounts")
    total_receivables: float = Field(..., ge=0, description="Sum of all pending inflow amounts")
    current_cash_balance: float = Field(..., description="Cash balance at time of calculation")

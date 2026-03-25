from typing import Literal
from pydantic import BaseModel, Field


class Obligation(BaseModel):
    """A single payable obligation that the decision engine must prioritise."""

    id: str = Field(..., description="Supabase transaction UUID")
    counterparty: str
    amount: float = Field(..., gt=0, description="Amount owed in INR")
    due_date: str = Field(..., description="ISO-8601 date string YYYY-MM-DD")
    category: str = Field(..., description="e.g. rent, supplier_invoice, marketing")
    flexibility: Literal["none", "medium", "high"] = Field(
        ..., description="User-tagged or auto-inferred payment flexibility"
    )
    penalty_rate: float = Field(
        default=0.0, ge=0,
        description="Fractional daily penalty rate (e.g. 0.02 = 2% per day)",
    )
    # Only used in scenario_c response — not required on input
    include: bool | None = Field(
        None, description="Scenario C toggle: True = pay, False = defer"
    )


class Scenario(BaseModel):
    """The output for one pay/defer scenario."""

    pay_list: list[Obligation]
    defer_list: list[Obligation]
    days_to_zero_delta: int = Field(
        ...,
        description="Change in days_to_zero versus the current baseline (positive = extended runway)",
    )
    total_penalty_if_deferred: float = Field(
        ..., ge=0,
        description="Estimated daily penalty cost for all obligations in defer_list",
    )


class DecideRequest(BaseModel):
    """Input to Layer 3."""

    business_id: str = Field(..., description="UUID of the business in Supabase")


class DecideResponse(BaseModel):
    """Output of Layer 3: three deterministic pay/defer scenarios."""

    available_cash: float = Field(..., description="Cash balance at decision time")
    scenario_a: Scenario = Field(..., description="Greedy Optimal: sort by score, pay until cash runs out")
    scenario_b: Scenario = Field(..., description="Conservative: pay all none-flexibility, defer the rest")
    scenario_c: Scenario = Field(
        ...,
        description="Custom: all obligations with include toggles; frontend lets user flip them",
    )

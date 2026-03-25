"""Pydantic models for Layer 3 — Decision Sandbox (Scenario Branching).

DecideResponse is the single output contract for the /api/decide endpoint.
All fields are deterministic; no LLM values are present here.
"""

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
    include: bool | None = Field(
        None, description="Frontend toggle: True = pay, False = defer"
    )


class Scenario(BaseModel):
    """The output for one evaluated strategy.

    Fields:
      - name:            Human-readable strategy label.
      - actions:         Chronological list of decisions made (pay / defer).
      - min_balance:     Lowest projected cash balance during the simulation.
      - total_penalties:  Total penalty cost accrued from all deferrals
                         (penalty_rate * amount * defer_days).
      - pay_list:        Obligations paid at their original (or only) due date.
      - defer_list:      Obligations that were deferred at least once.
    """

    name: str = Field(
        ..., description="Strategy name: Baseline, Survival, or Smart Penalty Minimization"
    )
    actions: list[str] = Field(
        default_factory=list,
        description="Human-readable list of actions (e.g. 'Deferred Invoice A by 15 days')",
    )
    min_balance: float = Field(
        ..., description="Lowest projected cash balance during the simulation (INR)"
    )
    total_penalties: float = Field(
        ..., ge=0,
        description="Total penalty cost accrued from deferrals (penalty_rate × amount × defer_days)",
    )
    pay_list: list[Obligation] = Field(
        default_factory=list,
        description="Obligations paid at their original due date (never deferred)",
    )
    defer_list: list[Obligation] = Field(
        default_factory=list,
        description="Obligations deferred to a later date",
    )


class DecideRequest(BaseModel):
    """Input to Layer 3."""

    business_id: str = Field(..., description="UUID of the business in Supabase")


class DecideResponse(BaseModel):
    """Output of Layer 3: three deterministic strategies with a recommendation.

    Scenarios:
      - scenario_a: Baseline — pay all on time.
      - scenario_b: Survival — defer medium/high flexibility, hoard cash.
      - scenario_c: Smart Penalty Minimization — greedy day-by-day deferral.
    """

    available_cash: float = Field(..., description="Cash balance at decision time (INR)")
    scenario_a: Scenario = Field(
        ..., description="Baseline: pay every obligation on its due date"
    )
    scenario_b: Scenario = Field(
        ..., description="Survival: defer all medium/high flexibility items by 30 days"
    )
    scenario_c: Scenario = Field(
        ..., description="Smart Penalty Minimization: greedy day-by-day deferral simulation"
    )
    recommended_scenario: str = Field(
        ...,
        description=(
            "Name of the winning strategy. Picks the strategy that keeps "
            "min_balance >= 0 with the lowest total_penalties; if all go "
            "negative, picks the highest min_balance."
        ),
    )

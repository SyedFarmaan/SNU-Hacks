from typing import Literal
from pydantic import BaseModel, Field
from models.decision_models import Obligation, Scenario


class CounterpartyProfile(BaseModel):
    """Relationship metadata used to calibrate email tone."""

    name: str
    tier: Literal["strategic", "standard", "flexible"]
    relationship_notes: str = ""


class RecommendRequest(BaseModel):
    """Input to Layer 4: chosen scenario output plus counterparty relationship data."""

    business_id: str
    chosen_scenario_name: Literal["scenario_a", "scenario_b", "scenario_c"]
    scenario: Scenario
    counterparty_profiles: list[CounterpartyProfile] = Field(
        default_factory=list,
        description="Profiles fetched from Supabase; used to match tone per deferred obligation",
    )


class DraftEmail(BaseModel):
    """A single negotiation email generated for one deferred obligation."""

    counterparty: str
    tier: Literal["strategic", "standard", "flexible"]
    subject: str
    body: str


class RecommendResponse(BaseModel):
    """Output of Layer 4: Gemini-generated explanation, emails, and action checklist."""

    cot_explanation: str = Field(
        ..., description="3–4 sentence plain-English justification of the chosen trade-off"
    )
    draft_emails: list[DraftEmail] = Field(
        ..., description="One email per deferred obligation, tone-matched to counterparty tier"
    )
    action_checklist: list[str] = Field(
        ..., description="Ordered list of concrete next steps for the business owner"
    )

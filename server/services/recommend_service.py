"""Layer 4 — Recommendation Engine Service.

Responsibilities:
  1. Fetch counterparty_profiles from Supabase (if not provided inline).
  2. Build a structured prompt from the chosen Layer 3 scenario.
  3. Call Gemini Pro in JSON mode with Chain-of-Thought instructions.
  4. Parse and validate the structured response.

No financial math is performed here — that is Layer 2/3's responsibility.
All financial figures in the prompt come directly from the caller.
"""

import json
import re

from core.gemini_client import get_client, PRO_MODEL
from core.supabase_client import get_supabase
from models.decision_models import Obligation
from models.recommend_models import (
    CounterpartyProfile,
    DraftEmail,
    RecommendRequest,
    RecommendResponse,
)

_RECOMMEND_SYSTEM_PROMPT = """You are a financial advisor assistant for a small business owner in India.
You will receive a JSON object describing a pay/defer scenario and counterparty relationship details.

Return ONLY a valid JSON object — no markdown, no prose, no extra keys — matching this exact schema:
{
  "cot_explanation": "<3-4 sentence plain-English justification of the trade-off>",
  "draft_emails": [
    {
      "counterparty": "<string>",
      "tier": "<strategic|standard|flexible>",
      "subject": "<string>",
      "body": "<string>"
    }
  ],
  "action_checklist": ["<step 1>", "<step 2>", "..."]
}

Email tone rules:
- strategic: Formal, relationship-preserving language. Acknowledge importance of the relationship.
  Offer partial payment or a concrete timeline. Never use vague language.
- standard: Professional and factual. State the rescheduling date clearly. Apologise briefly.
- flexible: Direct and brief. State the request for an extension without over-explaining.

Rules:
- cot_explanation must justify WHY this pay/defer split was chosen (penalty impact, relationship risk).
- action_checklist must be ordered — highest-urgency item first.
- Do not add any data not present in the input JSON.
"""


def _build_prompt(request: RecommendRequest) -> str:
    """Serialise the scenario and counterparty data into the Gemini input payload.

    Args:
        request: RecommendRequest containing scenario data and counterparty profiles.

    Returns:
        JSON string to pass as the user turn in the Gemini conversation.
    """
    defer_summaries = [
        {
            "counterparty": ob.counterparty,
            "amount": ob.amount,
            "due_date": ob.due_date,
            "penalty_rate": ob.penalty_rate,
        }
        for ob in request.scenario.defer_list
    ]
    pay_summaries = [
        {
            "counterparty": ob.counterparty,
            "amount": ob.amount,
            "due_date": ob.due_date,
        }
        for ob in request.scenario.pay_list
    ]
    profile_map = {p.name.lower(): p.model_dump() for p in request.counterparty_profiles}

    payload = {
        "chosen_scenario": request.chosen_scenario_name,
        "days_to_zero_delta": request.scenario.days_to_zero_delta,
        "total_penalty_if_deferred": request.scenario.total_penalty_if_deferred,
        "pay_list": pay_summaries,
        "defer_list": defer_summaries,
        "counterparty_profiles": profile_map,
    }
    return json.dumps(payload, ensure_ascii=False)


def _extract_json(raw: str) -> dict:
    """Strip markdown fencing from Gemini output and parse JSON.

    Args:
        raw: Raw text returned by Gemini.

    Returns:
        Parsed dictionary.

    Raises:
        ValueError: If valid JSON cannot be extracted.
    """
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Gemini returned non-JSON output: {raw[:300]}") from exc


def _fetch_counterparty_profiles(business_id: str) -> list[CounterpartyProfile]:
    """Fetch counterparty tier information from Supabase for a given business.

    Args:
        business_id: Supabase UUID of the business.

    Returns:
        List of CounterpartyProfile objects.
    """
    supabase = get_supabase()
    result = (
        supabase.table("counterparty_profiles")
        .select("name, tier, relationship_notes")
        .eq("business_id", business_id)
        .execute()
    )
    profiles = []
    for row in result.data:
        profiles.append(
            CounterpartyProfile(
                name=row["name"],
                tier=row["tier"],
                relationship_notes=row.get("relationship_notes", ""),
            )
        )
    return profiles


def generate_recommendation(request: RecommendRequest) -> RecommendResponse:
    """Call Gemini Pro to produce CoT explanation, draft emails, and action checklist.

    Args:
        request: RecommendRequest containing the chosen scenario from Layer 3 and
                 optional counterparty profiles (fetched from Supabase if not supplied).

    Returns:
        RecommendResponse with:
          - cot_explanation: 3–4 sentence plain-English trade-off justification.
          - draft_emails: One email per deferred obligation, tone-matched to counterparty tier.
          - action_checklist: Ordered list of concrete next steps.

    Algorithm:
        1. If counterparty_profiles is empty, fetch from Supabase.
        2. Build a structured JSON prompt from the scenario data.
        3. Call Gemini Pro with the system prompt enforcing JSON-only output.
        4. Parse and validate the response into RecommendResponse.
        5. For any deferred obligation with no profile, default tier to 'standard'.
    """
    client = get_client()

    # 1. Fill missing profiles from Supabase
    profiles = request.counterparty_profiles
    if not profiles:
        profiles = _fetch_counterparty_profiles(request.business_id)

    # Rebuild request with fetched profiles so prompt builder sees them
    enriched = request.model_copy(update={"counterparty_profiles": profiles})

    # 2. Build prompt
    user_payload = _build_prompt(enriched)

    # 3. Call Gemini Pro
    response = client.models.generate_content(
        model=PRO_MODEL,
        contents=[_RECOMMEND_SYSTEM_PROMPT, user_payload],
    )
    raw = _extract_json(response.text)

    # 4. Build draft emails — fill missing tiers with 'standard'
    profile_tier_map = {p.name.lower(): p.tier for p in profiles}
    draft_emails: list[DraftEmail] = []
    for email_data in raw.get("draft_emails", []):
        tier = email_data.get("tier") or profile_tier_map.get(
            email_data.get("counterparty", "").lower(), "standard"
        )
        draft_emails.append(
            DraftEmail(
                counterparty=email_data["counterparty"],
                tier=tier,
                subject=email_data["subject"],
                body=email_data["body"],
            )
        )

    return RecommendResponse(
        cot_explanation=raw["cot_explanation"],
        draft_emails=draft_emails,
        action_checklist=raw.get("action_checklist", []),
    )

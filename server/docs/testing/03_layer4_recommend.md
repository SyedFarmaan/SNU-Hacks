# Layer 4 — Recommendation Engine Testing Guide

**Route:** `POST /api/recommend`
**Service:** `services/recommend_service.py`
**What it does:** Takes a chosen Layer 3 scenario and calls Gemini Pro to generate a Chain-of-Thought explanation, tone-matched draft negotiation emails (one per deferred obligation), and an ordered action checklist.

**Prerequisites:** `00_setup.md` steps 1–3 and 5, plus a valid `GEMINI_API_KEY` in `.env`.

---

## What the API Reads from Supabase

| Table | Fields queried | When |
|---|---|---|
| `counterparty_profiles` | `name, tier, relationship_notes` | Only if `counterparty_profiles` array in the request is empty |

> The scenario data itself (pay_list, defer_list, etc.) is passed directly in the request body — it is not re-fetched from Supabase. Copy it from your Layer 3 response.

---

## Step 1: Get a Real Scenario from Layer 3

Run `/api/decide` first (see `02_layer3_decide.md`) and copy the full response. You need the actual UUIDs from that response for the `id` fields in the request below.

---

## Request

Replace the `id` values with the real UUIDs from your `/api/decide` response:

```json
POST /api/recommend

{
  "business_id": "aaaaaaaa-0000-0000-0000-000000000001",
  "chosen_scenario_name": "scenario_a",
  "scenario": {
    "pay_list": [
      {
        "id": "<uuid-of-rent-transaction-from-decide-response>",
        "counterparty": "Property Owner - MG Road",
        "amount": 60000,
        "due_date": "<today + 3 days as YYYY-MM-DD>",
        "category": "payable",
        "flexibility": "none",
        "penalty_rate": 0.05,
        "include": null
      }
    ],
    "defer_list": [
      {
        "id": "<uuid-of-supplier-transaction-from-decide-response>",
        "counterparty": "BuildMart Supplies",
        "amount": 28000,
        "due_date": "<today + 5 days as YYYY-MM-DD>",
        "category": "payable",
        "flexibility": "medium",
        "penalty_rate": 0.02,
        "include": null
      }
    ],
    "days_to_zero_delta": 0,
    "total_penalty_if_deferred": 560.0
  },
  "counterparty_profiles": []
}
```

> Passing `"counterparty_profiles": []` tells the service to auto-fetch profiles from Supabase using the `business_id`. The profiles were seeded in `00_setup.md`.

### Via Swagger UI

1. Open `http://localhost:8000/docs`
2. Click `POST /api/recommend` → **Try it out**
3. Paste the request body above (with real UUIDs filled in)
4. Click **Execute**

### Via curl

```bash
curl -X POST http://localhost:8000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "business_id": "aaaaaaaa-0000-0000-0000-000000000001",
    "chosen_scenario_name": "scenario_a",
    "scenario": {
      "pay_list": [{
        "id": "<real-uuid>",
        "counterparty": "Property Owner - MG Road",
        "amount": 60000,
        "due_date": "2026-03-28",
        "category": "payable",
        "flexibility": "none",
        "penalty_rate": 0.05,
        "include": null
      }],
      "defer_list": [{
        "id": "<real-uuid>",
        "counterparty": "BuildMart Supplies",
        "amount": 28000,
        "due_date": "2026-03-30",
        "category": "payable",
        "flexibility": "medium",
        "penalty_rate": 0.02,
        "include": null
      }],
      "days_to_zero_delta": 0,
      "total_penalty_if_deferred": 560.0
    },
    "counterparty_profiles": []
  }'
```

---

## Expected Response

```json
{
  "cot_explanation": "Riya's Restaurant must prioritise the rent payment of ₹60,000 due in 3 days because it carries a non-negotiable 'none' flexibility and a high 5% daily penalty — missing it risks eviction. BuildMart Supplies, with a lower penalty rate and medium flexibility, is a reasonable candidate for deferral to preserve some cash. While this scenario still pushes the balance negative, the incoming ₹50,000 receivable from Taj Catering Services in 10 days provides a recovery path.",
  "draft_emails": [
    {
      "counterparty": "BuildMart Supplies",
      "tier": "standard",
      "subject": "Request for Payment Extension — Riya's Restaurant",
      "body": "Dear BuildMart Supplies team,\n\nI hope this message finds you well. We are writing to request a short extension on our outstanding invoice of ₹28,000 due on [date]. Due to a temporary cash flow constraint, we are unable to process this payment by the original due date.\n\nWe expect to clear this balance in full by [date + 10 days] and will confirm the exact transfer date by end of this week.\n\nWe sincerely apologise for the inconvenience and value our ongoing business relationship.\n\nWarm regards,\nRiya's Restaurant"
    }
  ],
  "action_checklist": [
    "Transfer ₹60,000 to Property Owner - MG Road by <due date>",
    "Contact BuildMart Supplies to negotiate a 10-day extension and send the draft email",
    "Follow up on the ₹50,000 receivable from Taj Catering Services",
    "Review cash position again after receivable lands"
  ]
}
```

> Gemini's exact output will vary between calls. The structure will always match the schema above.

---

## What to Verify

| Field | What to check |
|---|---|
| `cot_explanation` | 3–4 sentences, mentions both rent urgency and BuildMart deferral, references penalty or relationship risk |
| `draft_emails` length | Exactly 1 email (one per item in `defer_list`) |
| Email `counterparty` | Matches the counterparty name in `defer_list` |
| Email `tier` | `"standard"` — matches the seeded counterparty profile for BuildMart |
| Email `body` tone | Professional and factual (standard tier tone), includes a rescheduling reference |
| `action_checklist` order | Rent payment first (highest urgency), then BuildMart negotiation, then receivable follow-up |

---

## Email Tone Matrix (for reference)

| Counterparty Tier | Expected Tone |
|---|---|
| `strategic` | Formal, relationship-preserving, offers partial payment or concrete timeline |
| `standard` | Professional, factual, states rescheduling date, brief apology |
| `flexible` | Direct and brief, states the extension request without over-explaining |

To test different tones, change the `tier` field in `counterparty_profiles`:
- Pass profiles **inline** in the request to override Supabase values:

```json
"counterparty_profiles": [
  {
    "name": "BuildMart Supplies",
    "tier": "strategic",
    "relationship_notes": "Key long-term supplier"
  }
]
```

---

## Passing Profiles Inline vs. Fetching from Supabase

| `counterparty_profiles` in request | Behaviour |
|---|---|
| `[]` (empty array) | Service fetches profiles from `counterparty_profiles` table using `business_id` |
| Non-empty array | Service uses the provided profiles directly, skips Supabase fetch |
| Profile missing for a deferred counterparty | Tier defaults to `"standard"` |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `ValueError: Gemini returned non-JSON output` | Gemini added markdown or prose | Usually transient — retry. Check `GEMINI_API_KEY` if it persists. |
| `draft_emails` is empty | `defer_list` is empty | Ensure at least one obligation is in `defer_list` |
| `cot_explanation` is vague or generic | No counterparty profiles available | Confirm profiles were seeded or pass them inline in the request |
| `422 Unprocessable Entity` | `chosen_scenario_name` is not one of `scenario_a/b/c` | Use exactly `"scenario_a"`, `"scenario_b"`, or `"scenario_c"` |
| `500` error | Invalid `tier` value in profile | Tier must be exactly `"strategic"`, `"standard"`, or `"flexible"` |

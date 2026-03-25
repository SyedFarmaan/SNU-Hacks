# Layer 3 — Decision Sandbox Testing Guide

**Route:** `POST /api/decide`
**Service:** `services/decide_service.py`
**What it does:** Pure deterministic math — fetches pending outflow obligations from Supabase, scores each one by `(penalty_rate × amount) / flexibility_factor`, and generates three pay/defer scenarios (Greedy Optimal, Conservative, Custom).

**Prerequisites:** `00_setup.md` steps 1–3 and 5 (no Gemini needed).

---

## What the API Reads from Supabase

| Table | Fields queried | Filter |
|---|---|---|
| `businesses` | `current_cash_balance` | `id = business_id` |
| `transactions` | `id, counterparty, amount, due_date, category, flexibility, penalty_rate` | `business_id`, `status = 'pending'`, `type = 'outflow'` |

> Note: only **outflow** transactions are considered. Receivables (inflows) are not included in scenario scoring.

---

## Request

```json
POST /api/decide

{
  "business_id": "aaaaaaaa-0000-0000-0000-000000000001"
}
```

### Via Swagger UI

1. Open `http://localhost:8000/docs`
2. Click `POST /api/decide` → **Try it out**
3. Paste the request body above
4. Click **Execute**

### Via curl

```bash
curl -X POST http://localhost:8000/api/decide \
  -H "Content-Type: application/json" \
  -d '{"business_id": "aaaaaaaa-0000-0000-0000-000000000001"}'
```

---

## Expected Response

Using the Crisis Mode seed data (cash = ₹42,000, two outflows: rent ₹60,000 and supplier ₹28,000):

```json
{
  "available_cash": 42000.0,
  "scenario_a": {
    "pay_list": [
      {
        "id": "<uuid>",
        "counterparty": "Property Owner - MG Road",
        "amount": 60000.0,
        "due_date": "<today + 3 days>",
        "category": "payable",
        "flexibility": "none",
        "penalty_rate": 0.05,
        "include": null
      }
    ],
    "defer_list": [
      {
        "id": "<uuid>",
        "counterparty": "BuildMart Supplies",
        "amount": 28000.0,
        "due_date": "<today + 5 days>",
        "category": "payable",
        "flexibility": "medium",
        "penalty_rate": 0.02,
        "include": null
      }
    ],
    "days_to_zero_delta": 0,
    "total_penalty_if_deferred": 560.0
  },
  "scenario_b": {
    "pay_list": [
      { "counterparty": "Property Owner - MG Road", "flexibility": "none", ... }
    ],
    "defer_list": [
      { "counterparty": "BuildMart Supplies", "flexibility": "medium", ... }
    ],
    "days_to_zero_delta": 0,
    "total_penalty_if_deferred": 560.0
  },
  "scenario_c": {
    "pay_list": [
      { "counterparty": "Property Owner - MG Road", "include": true, ... }
    ],
    "defer_list": [
      { "counterparty": "BuildMart Supplies", "include": false, ... }
    ],
    "days_to_zero_delta": 0,
    "total_penalty_if_deferred": 560.0
  }
}
```

---

## What to Verify

### Scenario A — Greedy Optimal

| Check | Expected | Why |
|---|---|---|
| Rent is in `pay_list` | Yes | `flexibility = 'none'` — always paid regardless of cash |
| BuildMart is in `defer_list` | Yes | Cash (42k) < Rent (60k) already depleted; BuildMart gets deferred |
| `total_penalty_if_deferred` | `560.0` | `0.02 × 28000 = 560` (one day's penalty cost) |

### Scenario B — Conservative

| Check | Expected | Why |
|---|---|---|
| `pay_list` | Rent only | Conservative pays only `flexibility = 'none'` items |
| `defer_list` | BuildMart | Everything with `flexibility = 'medium'` or `'high'` is deferred |

### Scenario C — Custom

| Check | Expected | Why |
|---|---|---|
| All obligations present | Yes | Scenario C shows all obligations with `include` toggles |
| `include` defaults | Mirrors Scenario A | Frontend flips toggles; backend presets to greedy recommendation |

---

## Priority Scoring Formula (for reference)

```
score = (penalty_rate × amount) / flexibility_factor[flexibility]
```

Flexibility factors:
- `none` → 0.1 (small divisor → very high score → pay first)
- `medium` → 1.0
- `high` → 3.0

For Crisis Mode:
- Rent: `(0.05 × 60000) / 0.1 = 30,000` — very high priority
- BuildMart: `(0.02 × 28000) / 1.0 = 560` — lower priority

---

## Flexibility Auto-Inference

If a transaction has no `flexibility` value set in the DB, it is inferred from `category`:

| Category | Auto-inferred flexibility |
|---|---|
| `rent`, `loan_emi`, `utility`, `tax` | `none` |
| `supplier_invoice`, `contractor` | `medium` |
| `marketing`, `subscription`, `misc` | `high` |

To test this, insert a transaction without setting the `flexibility` column and confirm the engine infers it correctly.

---

## Save the Response

**Copy the full response from this call** — you will need the exact `scenario` object (including real UUIDs) to pass to Layer 4 (`/api/recommend`).

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `scenario_a.pay_list` is empty | No pending outflow transactions | Confirm transactions have `type='outflow'` and `status='pending'` |
| `total_penalty_if_deferred` is `0.0` | `penalty_rate` is `0` on all transactions | Update seed data or insert transactions with non-zero `penalty_rate` |
| All obligations are in `pay_list` | Cash is large enough to cover everything | Reduce `current_cash_balance` in the `businesses` table to force deferrals |

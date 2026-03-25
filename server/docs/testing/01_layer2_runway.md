# Layer 2 — Runway Detection Testing Guide

**Route:** `POST /api/runway`
**Service:** `services/runway_service.py`
**What it does:** Pure deterministic math — fetches cash balance and pending transactions from Supabase, walks the timeline, and returns days-to-zero, financial health score, cash flow timeline, and liquidity gap.

**Prerequisites:** `00_setup.md` steps 1–3 and 5 (no Gemini needed).

---

## What the API Reads from Supabase

| Table | Fields queried | Filter |
|---|---|---|
| `businesses` | `current_cash_balance` | `id = business_id` |
| `transactions` | `counterparty, amount, due_date, type` | `business_id`, `status = 'pending'`, sorted by `due_date ASC` |

---

## Request

```json
POST /api/runway

{
  "business_id": "aaaaaaaa-0000-0000-0000-000000000001"
}
```

### Via Swagger UI

1. Open `http://localhost:8000/docs`
2. Click `POST /api/runway` → **Try it out**
3. Paste the request body above
4. Click **Execute**

### Via curl

```bash
curl -X POST http://localhost:8000/api/runway \
  -H "Content-Type: application/json" \
  -d '{"business_id": "aaaaaaaa-0000-0000-0000-000000000001"}'
```

---

## Expected Response

Using the Crisis Mode seed data (Riya's Restaurant, cash = ₹42,000):

```json
{
  "days_to_zero": 3,
  "health_score": 20,
  "timeline": [
    {
      "date": "<today + 3 days>",
      "balance": -18000.0,
      "counterparty": "Property Owner - MG Road",
      "transaction_type": "outflow",
      "amount": 60000.0
    },
    {
      "date": "<today + 5 days>",
      "balance": -46000.0,
      "counterparty": "BuildMart Supplies",
      "transaction_type": "outflow",
      "amount": 28000.0
    },
    {
      "date": "<today + 10 days>",
      "balance": 4000.0,
      "counterparty": "Taj Catering Services",
      "transaction_type": "inflow",
      "amount": 50000.0
    }
  ],
  "liquidity_gap": 46000.0,
  "total_payables": 88000.0,
  "total_receivables": 50000.0,
  "current_cash_balance": 42000.0
}
```

---

## What to Verify

| Field | Expected Value | Why |
|---|---|---|
| `current_cash_balance` | `42000.0` | Matches the seeded value |
| `total_payables` | `88000.0` | Rent (60k) + Supplier (28k) |
| `total_receivables` | `50000.0` | Taj Catering inflow |
| `days_to_zero` | `3` | Balance goes negative on day 3 when rent (60k) hits: 42000 − 60000 = −18000 |
| `liquidity_gap` | `46000.0` | Deepest negative point: after both outflows, balance = −46000 |
| `health_score` | `10–30` (crisis range) | days_to_zero=3 → runway component=10; stress_ratio=88000/92000≈0.96 → stress component=10 |
| `timeline` length | `3` entries | One entry per pending transaction |
| `timeline` order | Chronological by date | Sorted ascending by due_date |

---

## Health Score Formula (for reference)

The score is the sum of two components (max 100):

**Runway component** (max 60 pts):

| days_to_zero | Points |
|---|---|
| 0 | 0 |
| 1–7 | 10 |
| 8–14 | 20 |
| 15–30 | 35 |
| 31–60 | 50 |
| 61+ or None | 60 |

**Stress component** (max 40 pts, based on `total_payables / (cash + receivables)`):

| Stress ratio | Points |
|---|---|
| ≤ 0.25 | 40 |
| ≤ 0.50 | 30 |
| ≤ 0.75 | 20 |
| ≤ 1.00 | 10 |
| > 1.00 | 0 |

For Crisis Mode: ratio = 88000 / (42000 + 50000) ≈ 0.96 → stress points = 10. days_to_zero = 3 → runway points = 10. **Total = 20.**

---

## Additional Test Cases

### Stable business (no obligations)
Insert a business with high cash and no transactions:

```sql
INSERT INTO businesses (id, name, current_cash_balance)
VALUES ('bbbbbbbb-0000-0000-0000-000000000002', 'Apex Consulting', 500000);
```

Call with `"business_id": "bbbbbbbb-0000-0000-0000-000000000002"`.

Expected: `days_to_zero = null`, `health_score = 100`, `timeline = []`, `liquidity_gap = 0`.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `500 — single() returned no rows` | business_id not in DB | Re-run the seed SQL from `00_setup.md` |
| `timeline` is empty | No `status='pending'` transactions | Confirm transactions were inserted with `status='pending'` |
| `days_to_zero` is `null` unexpectedly | All outflows are covered by inflows | Check transaction amounts and types in Supabase |

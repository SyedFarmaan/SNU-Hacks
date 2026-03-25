# Layer 1 — Document Ingestion Testing Guide

**Route:** `POST /api/ingest`
**Service:** `services/ingest_service.py`
**What it does:** Accepts a multipart file upload (PDF or image), sends it to Gemini Flash with a strict JSON-only prompt, parses the structured transactions out of the response, and flags potential duplicates against existing Supabase records.

**Prerequisites:** `00_setup.md` steps 1–5 (Gemini API key required, Storage bucket recommended).

---

## What the API Reads from Supabase

| Table | Fields queried | Purpose |
|---|---|---|
| `transactions` | `id, counterparty, amount, due_date` | Duplicate detection — checks for same counterparty + amount within ±3 days |

> The API does **not** write to Supabase. It returns parsed transactions for the frontend to review and confirm before inserting.

---

## Accepted File Types

| Format | MIME type |
|---|---|
| PDF | `application/pdf` |
| JPEG | `image/jpeg` |
| PNG | `image/png` |
| WebP | `image/webp` |
| HEIC | `image/heic` |

Any other format returns HTTP 415.

---

## Prepare a Test Document

You need a real file to upload. Options from easiest to most realistic:

### Option A — Photo of a handwritten note (quickest)
Write on paper and take a photo:
```
Invoice
Vendor: ABC Traders
Amount: Rs. 15,000
Date: 2026-04-01
Purpose: Kitchen supplies
```
Save as a `.jpg`.

### Option B — Screenshot of a simple table
Create a table in any app and screenshot it:

| Counterparty | Amount | Date | Type |
|---|---|---|---|
| Fresh Produce Co. | 8500 | 2026-04-03 | outflow |
| Event Catering Ltd. | 25000 | 2026-04-10 | inflow |

### Option C — PDF bank statement
Any real or synthetic bank statement PDF works. Gemini can handle multi-page PDFs.

---

## Test 1 — Basic Parse (No Duplicates Expected)

Upload a document whose counterparty + amount combination does **not** already exist in Supabase.

### Via curl

```bash
# PDF
curl -X POST http://localhost:8000/api/ingest \
  -F "business_id=aaaaaaaa-0000-0000-0000-000000000001" \
  -F "file=@/path/to/invoice.pdf;type=application/pdf"

# JPEG image
curl -X POST http://localhost:8000/api/ingest \
  -F "business_id=aaaaaaaa-0000-0000-0000-000000000001" \
  -F "file=@/path/to/invoice.jpg;type=image/jpeg"
```

### Via Swagger UI

1. Open `http://localhost:8000/docs`
2. Click `POST /api/ingest` → **Try it out**
3. Fill `business_id` = `aaaaaaaa-0000-0000-0000-000000000001`
4. Click **Choose File** and select your document
5. Click **Execute**

### Expected Response

```json
{
  "document_type": "invoice",
  "transactions": [
    {
      "counterparty": "ABC Traders",
      "amount": 15000.0,
      "transaction_date": "2026-04-01",
      "transaction_type": "outflow",
      "raw_description": "Kitchen supplies invoice"
    }
  ],
  "duplicate_flags": []
}
```

### What to Verify

| Field | Check |
|---|---|
| `document_type` | One of `bank_statement`, `invoice`, `receipt` — matches the document |
| `transactions` | Non-empty; fields match what is visible in the document |
| `counterparty` | Vendor or customer name extracted correctly |
| `amount` | Positive float, correct value |
| `transaction_date` | In `YYYY-MM-DD` format |
| `transaction_type` | `"inflow"` or `"outflow"` — correct direction |
| `duplicate_flags` | Empty for a brand-new document |

---

## Test 2 — Duplicate Detection

Upload the same (or very similar) document a second time to trigger the duplicate flag.

**Step 1:** After Test 1, the parsed transaction is not yet in Supabase (the API only parses, it doesn't insert). To test duplicate detection, manually insert the transaction first:

```sql
INSERT INTO transactions (business_id, type, counterparty, amount, due_date, status, category)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'outflow', 'ABC Traders', 15000,
  '2026-04-01',
  'pending', 'payable'
);
```

**Step 2:** Upload the same document again via `POST /api/ingest`.

### Expected Response (with duplicate flag)

```json
{
  "document_type": "invoice",
  "transactions": [
    {
      "counterparty": "ABC Traders",
      "amount": 15000.0,
      "transaction_date": "2026-04-01",
      "transaction_type": "outflow",
      "raw_description": "Kitchen supplies invoice"
    }
  ],
  "duplicate_flags": [
    {
      "transaction_index": 0,
      "matched_transaction_id": "<uuid-of-the-row-you-inserted>",
      "match_reason": "Existing record id=<uuid> has same counterparty 'ABC Traders', amount=15000.0, date=2026-04-01 (within ±3 days)"
    }
  ]
}
```

### What to Verify

| Field | Check |
|---|---|
| `duplicate_flags` length | 1 (one flag per matched transaction) |
| `transaction_index` | `0` — refers to the first transaction in the `transactions` array |
| `match_reason` | Contains counterparty name, amount, and date |

---

## Test 3 — Unsupported File Type

Upload a `.txt` or `.csv` file to confirm the 415 rejection.

```bash
curl -X POST http://localhost:8000/api/ingest \
  -F "business_id=aaaaaaaa-0000-0000-0000-000000000001" \
  -F "file=@/path/to/data.csv;type=text/csv"
```

**Expected:** HTTP 415 with body:
```json
{
  "detail": "Unsupported file type 'text/csv'. Accepted: PDF, JPEG, PNG, WEBP, HEIC."
}
```

---

## Test 4 — Multi-Transaction Document (Bank Statement)

Upload a document with multiple transactions (e.g., a bank statement PDF or a screenshot of a table).

**Expected:** `transactions` array contains one entry per transaction found. `duplicate_flags` lists any that match existing Supabase records.

---

## Gemini Parsing Behaviour

- Gemini uses the model `gemini-1.5-flash` for this layer (fast, cost-efficient).
- The prompt strictly instructs Gemini to return only JSON — no prose, no markdown.
- If a field in the document cannot be read clearly, Gemini omits that transaction rather than guessing.
- Dates are normalised to `YYYY-MM-DD`.
- Amounts are always positive floats; direction is captured in `transaction_type`.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| HTTP 415 | File MIME type not in allowed list | Use PDF, JPEG, PNG, or WEBP |
| `transactions` is empty | Document had no readable financial data | Try a clearer image or a different document |
| `ValueError: Gemini returned non-JSON` | Gemini added prose or markdown | Retry — usually transient. If persistent, check API key quota. |
| `duplicate_flags` is empty when you expected a hit | Transaction not yet in Supabase | Run the INSERT from Test 2 first |
| `transaction_date` wrong format | Gemini misread a non-standard date format | Use documents with clear `DD/MM/YYYY` or `YYYY-MM-DD` dates |
| `amount` seems wrong | Document uses commas as thousands separator | Gemini usually handles this; if not, try a cleaner document |

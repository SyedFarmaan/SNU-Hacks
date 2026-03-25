# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Run the development server
uvicorn main:app --reload

# Run on a specific port
uvicorn main:app --reload --port 8000
```

There are no tests yet. The API can be explored at `http://localhost:8000/docs` (Swagger UI) after starting the server.

## Architecture

**CashFlow Copilot** is a 4-layer financial decision engine for SMEs. The backend is Python FastAPI; the frontend (separate repo) is Next.js 14. Database and auth are Supabase (PostgreSQL). LLM calls use Google Gemini (Flash for OCR, Pro for reasoning).

**Core design rule:** Layers 1–3 are pure deterministic Python math. LLM is used *only* in Layer 1 (document parsing) and Layer 4 (output explanation). No financial math is delegated to Gemini.

### The 4 Layers

| Route | Layer | What it does |
|---|---|---|
| `/api/ingest` | Layer 1 | Gemini Vision parses uploaded bank statements, invoices, receipts → structured transactions |
| `/api/runway` | Layer 2 | Deterministic: computes Days-to-Zero, Financial Health Score (0–100), cash flow timeline |
| `/api/decide` | Layer 3 | Greedy optimization: scores obligations by `(penalty_rate × amount) / flexibility_factor`, generates 3 pay/defer scenarios |
| `/api/recommend` | Layer 4 | Gemini Pro: Chain-of-Thought explanation, tone-matched draft negotiation emails, action checklist |

### Project Structure

```
server/
├── main.py               # FastAPI app, CORS config, router registration
├── controllers/          # Route handlers (one file per API layer)
├── services/             # Business logic (runway math, greedy algorithm)
├── models/               # Pydantic data models
├── core/                 # Shared config, Supabase/Gemini clients
├── utils/                # Helpers (deduplication, health score formula)
└── docs/                 # Architecture doc (authoritative reference)
```

### Key Data Models (Supabase schema)

- `businesses` — one row per SME, holds `current_cash_balance` and computed `financial_health_score`
- `transactions` — payables/receivables with `flexibility ENUM('none','medium','high')` and `penalty_rate`
- `counterparty_profiles` — vendor/customer tier (`strategic/standard/flexible`) controls email tone in Layer 4
- `documents` — uploaded files; `parsed_json` holds raw Gemini output before user confirmation
- `decisions` — stored scenario outputs including `cot_explanation` and `draft_emails` JSONB

### Flexibility defaults (Layer 3)

Category → default flexibility auto-inferred:
- `rent, loan_emi, utility, tax` → `none`
- `supplier_invoice, contractor` → `medium`
- `marketing, subscription, misc` → `high`

User can override per obligation before the decision engine runs.

### Demo scenarios (seed data)

Three pre-seeded business profiles for demo reliability:
- 🔴 **Crisis Mode** — Riya's Restaurant (cash < obligations due in 3 days)
- 🟡 **Stress Mode** — Metro Retail Store (obligations exceed cash over 30 days)
- 🟢 **Stable Mode** — Apex Consulting (45+ day comfortable runway)

### Environment variables needed

```
SUPABASE_URL=
SUPABASE_KEY=
GEMINI_API_KEY=
```

Use `python-dotenv` with a `.env` file; load via `pydantic-settings`.

### Known import issue

`main.py` currently imports from `app.controllers` but controllers live at `controllers/` (no `app/` wrapper). This needs to be reconciled when fleshing out the project structure.

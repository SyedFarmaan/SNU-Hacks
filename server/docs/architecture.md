# CashFlow Copilot — Architecture & Implementation Plan

> **Track:** Fintech | **Platform:** Web App | **LLM:** Google Gemini API | **DB:** Supabase (PostgreSQL) | **Currency:** INR

---

## 1. Executive Summary

We are building a **4-layer, semi-autonomous financial decision engine** for SMEs.
The system ingests fragmented financial inputs, computes a real-time liquidity runway, runs a deterministic optimization to prioritize obligations, and translates complex math into actionable human-readable outputs using an LLM.

**Core Design Rule:** Layers 1–3 are pure deterministic logic. LLM (Gemini) is used **only** in Layer 1 (document parsing) and Layer 4 (output translation). No financial math is delegated to LLMs.

### Repository Hygiene Note (2026-03-25)

- Added a root-level `.gitignore` tailored for this monorepo setup:
- Python/FastAPI ignores (`__pycache__`, pytest/mypy/ruff caches, coverage, virtual environments).
- React/Vite ignores (`node_modules`, Vite build outputs, TypeScript build info).
- Local environment and editor artifacts (`.env*`, local overrides, IDE/OS files).
- Added Supabase migration workflow assets under `supabase/`:
- `supabase/migrations/*.sql` now defines schema, indexes/RLS policies, and Storage bucket setup.
- `supabase/seed.sql` now contains idempotent demo data for Crisis/Stress/Stable scenarios.

---

## 2. Feasibility Analysis & Honest Assessment

### ✅ What's Solid
| Layer | Verdict | Reason |
|---|---|---|
| Layer 1: Ingestion | ✅ Feasible | Gemini Vision handles PDFs, images, handwritten docs well |
| Layer 2: Runway Detection | ✅ Straightforward | Pure date-sorted math on a transactions table |
| Layer 3: Decision Sandbox | ✅ Feasible | Greedy sort on penalty × urgency attributes |
| Layer 4: CoT + Drafts | ✅ Feasible | Gemini 1.5 Pro is excellent at structured explanation |

### ⚠️ Risks & Gaps
1. **Data is the #1 constraint** — the system needs pre-structured financial data to work. Document parsing alone is not reliable enough for a live demo. → Mitigation: seed 3 realistic business scenarios + show upload flow on top.
2. **Greedy algorithm assumes you know obligation flexibility** — "can this vendor be deferred?" can't be extracted from a receipt. → Mitigation: user tags each obligation with a flexibility level (High/Medium/None) during review before decisions are made.
3. **Duplicate detection is hard** — same invoice may appear in bank statement AND uploaded invoice file. → Mitigation: deduplicate by amount + counterparty + date window (3-day fuzzy match).
4. **Days-to-Zero assumes no new income** — this will feel pessimistic. → Mitigation: include receivables in the runway calculation (cash + expected_inflows - outflows).

---

## 3. Improvements to the Original Idea

| Original | Improvement | Reason |
|---|---|---|
| "Days to Zero" only | Add **Financial Health Score (0–100)** | More intuitive, demo-friendly metric |
| Greedy algorithm | Expose **multiple scenario projections** (e.g., "Pay A+B defer C", "Pay A defer B+C") | Shows decision power, impresses judges |
| Generic LLM output | **Counterparty relationship profiling** (tier: Strategic / Standard / Flexible) | Directly satisfies the problem statement's "linguistic tone" requirement |
| Upload → parse → done | Add **manual correction UI** after parsing | Critical for reliability; lets user fix OCR errors before decisions run |
| Single view | **Two-mode UI**: Crisis Mode (red alerts) vs Stable Mode (planning view) | Shows context-awareness |

---

## 4. Data Strategy (Critical Section)

### Problem
A hackathon demo cannot rely on attendees providing real financial documents on the spot. The system must be pre-loaded with realistic data AND support live document upload.

### Solution: Dual-Track Data Approach

**Track A — Pre-seeded Demo Scenarios** (for reliability)

Seed 3 business profiles into the database at startup:

| Scenario | Business | Situation |
|---|---|---|
| 🔴 Crisis Mode | Riya's Restaurant | Cash: ₹42,000. Rent due ₹60,000 in 3 days. Supplier bill ₹28,000 in 5 days. Customer invoice outstanding ₹50,000 in 10 days. |
| 🟡 Stress Mode | Metro Retail Store | Cash: ₹1,80,000. Multiple obligations over 30 days totaling ₹2,40,000. |
| 🟢 Stable Mode | Apex Consulting | Cash: ₹5,00,000. Comfortable runway of 45+ days. |

**Track B — Live Document Upload** (for the wow factor)

Allow uploading:
- Bank statement PDF → Gemini parses transactions
- Invoice image / PDF → Gemini extracts vendor, amount, due date
- Receipt image (handwritten ok) → Gemini extracts line items

The parsed output always goes through a **review & confirm UI** before entering the financial model.

### Sample Documents to Prepare
Create the following artifacts for the demo:
- [ ] 1 synthetic bank statement PDF (CSV-style, 30 transactions)
- [ ] 2-3 invoice PDFs (vendor name, amount, due date)
- [ ] 1 handwritten receipt image (to show OCR wow factor)

---

## 5. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | **Next.js 14** (App Router) | Rich dashboard, server components, easy API routes |
| Styling | **Tailwind CSS** + shadcn/ui | Fast, professional UI |
| Charts | **Recharts** | Cash flow timeline visualization |
| Backend | **Python FastAPI** | Better for financial computation, async, easy Gemini integration |
| Database | **Supabase** (PostgreSQL) | Familiar, real-time, auth, storage built-in |
| Auth | **Supabase Auth** (simple email/password) | Single business owner login, minimal friction |
| File Storage | **Supabase Storage** | For uploaded documents |
| LLM | **Google Gemini 1.5 Flash** (OCR) + **Gemini 1.5 Pro** (CoT) | Cost-effective split |
| Currency | **INR (₹)** | Fixed, no multi-currency complexity |
| Hosting | **Vercel** (frontend) + **Railway/Render** (FastAPI backend) | Fast deployment |

---

## 6. Data Schema

```sql
-- Core entities

businesses (
  id, name, owner_email, created_at,
  current_cash_balance DECIMAL,
  financial_health_score INT  -- 0-100, computed
)

transactions (
  id, business_id,
  type ENUM('inflow', 'outflow'),
  counterparty VARCHAR,          -- vendor / customer name
  amount DECIMAL,
  due_date DATE,
  status ENUM('pending', 'paid', 'overdue', 'deferred'),
  category ENUM('payable', 'receivable', 'expense'),
  flexibility ENUM('none', 'medium', 'high'),  -- user-tagged
  penalty_rate DECIMAL,          -- % per day if late (default 0)
  source ENUM('manual', 'bank_statement', 'invoice', 'receipt'),
  raw_document_id UUID,
  notes TEXT
)

counterparty_profiles (
  id, business_id,
  name VARCHAR,
  tier ENUM('strategic', 'standard', 'flexible'),
  relationship_notes TEXT,
  total_outstanding DECIMAL
)

documents (
  id, business_id,
  file_url TEXT,                 -- Supabase Storage URL
  document_type ENUM('bank_statement', 'invoice', 'receipt'),
  parse_status ENUM('pending', 'parsed', 'confirmed', 'failed'),
  parsed_json JSONB,             -- raw Gemini output
  uploaded_at TIMESTAMP
)

decisions (
  id, business_id,
  generated_at TIMESTAMP,
  scenario_type VARCHAR,         -- e.g., "pay_A_defer_BC"
  days_to_zero_before INT,
  days_to_zero_after INT,
  total_penalty_saved DECIMAL,
  cot_explanation TEXT,          -- Gemini output
  action_items JSONB,            -- list of actions
  draft_emails JSONB             -- {counterparty: email_body}
)
```

---

## 7. System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    NEXT.JS FRONTEND                       │
│  Dashboard │ Upload │ Review │ Decision │ Action Center   │
└────────────────────┬─────────────────────────────────────┘
                     │ REST API calls
┌────────────────────▼─────────────────────────────────────┐
│                  FASTAPI BACKEND                          │
│                                                          │
│  /ingest     → Layer 1: Gemini Vision parsing            │
│  /runway     → Layer 2: Deterministic math engine        │
│  /decide     → Layer 3: Greedy optimization engine       │
│  /recommend  → Layer 4: Gemini CoT + email drafts        │
│                                                          │
└──────┬────────────────────────────┬───────────────────────┘
       │                            │
┌──────▼──────┐            ┌────────▼────────┐
│  SUPABASE   │            │  GEMINI API     │
│  PostgreSQL │            │  Flash (OCR)    │
│  Storage    │            │  Pro (CoT)      │
└─────────────┘            └─────────────────┘
```

---

## 8. Layer-by-Layer Implementation

### Layer 1: Omni-Channel Ingestion (`/api/ingest`)

**Flow:**
1. User uploads file → stored in Supabase Storage
2. FastAPI receives file URL → downloads and sends to Gemini Vision with structured prompt
3. Gemini returns JSON: `{document_type, transactions: [{counterparty, amount, date, type}]}`
4. System de-duplicates against existing transactions (amount + counterparty + ±3 day window)
5. Frontend shows parsed results in review table — user confirms or edits
6. Confirmed data is written to `transactions` table

**Gemini Prompt Strategy:**
```
System: You are a financial document parser. Extract all financial transactions from this document.
Return ONLY valid JSON in this exact schema: {
  "document_type": "bank_statement|invoice|receipt",
  "transactions": [
    {"counterparty": str, "amount": float, "date": "YYYY-MM-DD", 
     "type": "inflow|outflow", "description": str}
  ]
}
Do not infer, estimate, or add data not present in the document.
```

---

### Layer 2: Reality Check — Runway Detection (`/api/runway`)

**Algorithm (pure Python math, no LLM):**
```python
def compute_runway(business_id):
    cash = get_current_balance(business_id)
    transactions = get_pending_transactions(business_id, sorted_by='due_date')
    
    timeline = []
    running_balance = cash
    
    for tx in transactions:
        if tx.type == 'outflow':
            running_balance -= tx.amount
        else:
            running_balance += tx.amount
            
        timeline.append({
            'date': tx.due_date,
            'balance': running_balance,
            'counterparty': tx.counterparty
        })
        
        if running_balance < 0 and days_to_zero is None:
            days_to_zero = (tx.due_date - today).days

    health_score = compute_health_score(days_to_zero, stress_ratio)
    return {timeline, days_to_zero, health_score, liquidity_gap}
```

**Outputs:**
- Days to Zero integer
- Cash flow timeline array (for chart)
- Financial Health Score (0–100)
- Total liquidity gap amount

---

### Layer 3: Decision Sandbox (`/api/decide`)

**When:** triggered when `days_to_zero < threshold` (e.g., 30 days) or user manually triggers

**Algorithm:**
**Flexibility auto-inference (default, user can override):**
| Category | Default Flexibility |
|---|---|
| rent, loan_emi, utility, tax | `none` — must pay |
| supplier_invoice, contractor | `medium` — can negotiate |
| marketing, subscription, misc | `high` — can defer freely |

```python
def prioritize_obligations(obligations, available_cash):
    # Score each obligation — higher score = must pay first
    for ob in obligations:
        ob.score = (ob.penalty_rate * ob.amount) / flexibility_factor[ob.flexibility]
    
    obligations.sort(key=lambda x: x.score, reverse=True)
    
    # Greedy selection
    pay_list, defer_list = [], []
    remaining = available_cash
    
    for ob in obligations:
        if ob.flexibility == 'none' or remaining >= ob.amount:
            pay_list.append(ob)
            remaining -= ob.amount
        else:
            defer_list.append(ob)
    
    return pay_list, defer_list
```

**Generate 3 scenarios:**
- **Scenario A** (Greedy Optimal): Algorithm's recommended path
- **Scenario B** (Pay all critical, defer all flexible): Conservative
- **Scenario C** (User picks): Interactive override

Each scenario shows: days_to_zero delta, total penalty cost, relationships at risk.

---

### Layer 4: Context-Aware Execution (`/api/recommend`)

**Input to Gemini (structured):**
```json
{
  "scenario": "Greedy Optimal",
  "pay_list": [{"vendor": "BuildMart Supplies", "amount": 28000, "due": "2024-03-28"}],
  "defer_list": [{"vendor": "Office Rent", "amount": 60000, "due": "2024-03-26", "tier": "standard"}],
  "days_saved": 12,
  "penalty_avoided": 840,
  "counterparty_profiles": {...}
}
```

**Gemini outputs:**
1. **CoT Explanation**: 3-4 sentences justifying the trade-off in plain English
2. **Draft Emails**: For each deferred obligation, a tone-matched negotiation email
3. **Action Checklist**: Ordered list of steps for the business owner

**Tone Matrix:**
| Vendor Tier | Tone |
|---|---|
| Strategic | Formal, relationship-preserving, offer partial payment |
| Standard | Professional, factual, specific rescheduling date |
| Flexible | Direct, request extension, brief |

---

## 9. Frontend UI Plan

### Pages

| Route | Description |
|---|---|
| `/` | Landing page — upload or load a demo scenario |
| `/dashboard` | Main view — health score, days to zero, cash flow chart |
| `/documents` | Upload + review parsed documents |
| `/obligations` | List of all payables/receivables, add manually |
| `/decide` | Decision Sandbox — view scenarios, pick one |
| `/actions` | Final output — CoT reasoning, draft emails, action checklist |

### Dashboard Key Components
- **Health Score Gauge** (0–100, color-coded red/yellow/green)
- **Days to Zero Countdown** (large bold number)
- **Cash Flow Timeline Chart** (line chart showing balance over 30/60/90 days)
- **Liquidity Gap Alert Banner** (appears when cash < obligations)
- **Obligations Table** (sortable by due date, amount, priority)

---

## 10. Build Priority (Phased)

### Phase 1 — Core Engine (Build First)
- [ ] Database schema setup (Supabase)
- [ ] Seed demo data (3 scenarios)
- [ ] FastAPI project scaffold
- [ ] Layer 2: Runway detection API (`/runway`)
- [ ] Layer 3: Decision sandbox API (`/decide`)
- [ ] Next.js project scaffold
- [ ] Dashboard page with health score + chart + obligations table

### Phase 2 — Ingestion & LLM
- [ ] Supabase Storage setup
- [ ] Layer 1: Gemini Vision document parsing (`/ingest`)
- [ ] Document upload + review UI
- [ ] Layer 4: Gemini CoT recommendation (`/recommend`)
- [ ] Actions page with emails + checklist

### Phase 3 — Polish & Demo
- [ ] Counterparty profile management
- [ ] 3-scenario comparison view
- [ ] Manual obligation entry form
- [ ] Error states + loading skeletons
- [ ] Demo script walkthrough using Crisis Mode scenario

---

## 11. Layer 2 — Frontend Integration

### Route Wiring

The `/forecast` route in the React frontend (`frontend/src/App.tsx`) renders `CashFlowForecast.tsx`, which is now fully wired to `POST /api/runway` via `frontend/src/services/runwayApi.ts`.

### API Service (`runwayApi.ts`)

| Export | Purpose |
|---|---|
| `TimelineEntry` | Interface matching the `timeline` array items in `RunwayResponse` |
| `RunwayResponse` | Full typed interface for all 20+ fields returned by the runway endpoint |
| `RunwayRequest` | `{ business_id: string }` — the POST body shape |
| `fetchRunway(businessId)` | POSTs to `http://localhost:8000/api/runway`; throws on non-OK response |

### Page Section Mapping (`CashFlowForecast.tsx`)

| Page Section | `RunwayResponse` Fields Used |
|---|---|
| Emergency banner | `days_to_zero`, `liquidity_gap` |
| Financial Health Score gauge | `health_score` |
| Days to Zero card | `days_to_zero` |
| Available Cash card | `current_cash_balance`, `total_payables` |
| Cash Flow Forecast chart (`RunwayChart`) | `timeline`, `current_cash_balance` |
| Horizon Snapshots row | `cash_at_7d`, `cash_at_30d`, `cash_at_60d` |
| Burn Rate cards | `gross_burn_monthly`, `net_burn_monthly`, `cash_coverage_days`, `runway_months` |
| Obligation Pressure band | `overdue_receivables_pct`, `overdue_payables_pct`, `penalty_payables_pct`, `counterparty_concentration_risk`, `cash_flow_volatility` |
| Active Timeline table | `timeline` (all entries, no pagination) |

### Running Locally

```bash
# Backend
cd server && uvicorn main:app --reload --port 8000

# Frontend
cd frontend && npm run dev
# Navigate to http://localhost:5173/forecast
```

---

## 12. Confirmed Decisions

| Decision | Choice |
|---|---|
| Auth | Simple Supabase Auth (email/password). One login = one business. |
| Currency | INR (₹) only. No multi-currency. |
| Flexibility | Auto-inferred from category; user can override per obligation. |
| Dashboard refresh | Manual refresh (no real-time subscription for now). |

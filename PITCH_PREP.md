# FINAXIS — Final Pitch Preparation Guide

## One-Liner (Memorize This)

> **Finaxis is a CashFlow Copilot for Indian SMEs that predicts cash shortfalls, simulates pay/defer strategies, and auto-drafts vendor negotiation emails — using deterministic math for money and LLMs only for language.**

---

## Core Design Principle — "LLM for Language, Math for Money"

> "We never let an LLM touch a financial calculation. Layers 2 and 3 are 100% deterministic Python math — no randomness, no hallucination risk. LLMs are only used where language understanding is required: parsing documents in Layer 1 and generating human-readable emails in Layer 4. Every number on screen comes from math we wrote and tested."

This is our **strongest differentiator**. Lead with it.

---

## The 4 Layers

| Layer | Name | Engine | What It Does |
|-------|------|--------|-------------|
| 1 | Document Intelligence | Gemini Flash (Vision) | Parses bank statements, invoices, receipts, or plain-English chat into structured transactions. Flags duplicates. |
| 2 | Runway Detection | **Pure Python Math** | Days-to-zero, health score (0-100), burn rates, 7/30/60-day projections, concentration risk, volatility |
| 3 | Decision Sandbox | **Pure Python Math** | 3 strategies — Baseline (pay all), Survival (hoard cash), Smart (greedy penalty minimization). Picks optimal. |
| 4 | Action & Execution | Gemini Pro | Chain-of-Thought justification, tier-matched vendor emails, action checklist |

### Architecture Flow

```
Document/Chat --> [Layer 1: Gemini Flash] --> Structured Transactions --> Supabase
                                                       |
Business Cash + Transactions --> [Layer 2: Pure Math] --> Health Score, Days-to-Zero, Burn Rates
                                                       |
Pending Obligations --> [Layer 3: Pure Math] --> 3 Scenarios + Recommendation
                                                       |
Chosen Scenario + Profiles --> [Layer 4: Gemini Pro] --> CoT + Emails + Checklist
```

---

## Key Algorithms (Know These)

### 1. Financial Health Score (Layer 2) — out of 100

```
score = runway (max 50) + stress (max 30) + overdue_pressure (max 20)
```

- **Runway component**: Lookup table — 0 days = 0 pts, 7d = 10, 14d = 20, 30d = 30, 60d = 40, 61+ = 50
- **Stress component**: total_payables / (cash + receivables) — lower ratio = higher score
- **Overdue pressure**: % of payables past due — 0% overdue = 20 pts, >50% overdue = 0 pts

### 2. Obligation Priority Score (Layer 3) — decides what to defer

```
score = (max(penalty_rate, 0.001) * amount) / flexibility_factor
```

| Flexibility | Factor | Meaning |
|-------------|--------|---------|
| `none` (rent, tax, loan EMI) | 0.1 | Score x10 — **never defer** |
| `medium` (suppliers, contractors) | 1.0 | Neutral |
| `high` (marketing, subscriptions) | 3.0 | Score /3 — **defer first** |

### 3. Smart Penalty Minimization (Strategy C) — The Hero Algorithm

1. Group obligations by due date, process day-by-day
2. If cash covers today's obligations — pay all
3. If short — sort by priority score, defer the **lowest-score** (most deferrable) items by 15 days
4. `none`-flexibility items are **never** deferred
5. Each item deferred at most once
6. Penalty = penalty_rate x amount x 15 days

### 4. Recommendation Engine — picks the best strategy

1. Filter to **viable** strategies (min_balance >= 0, stays solvent)
2. Among viable — pick **lowest total penalties**
3. If ALL go negative — pick **highest min_balance** (least-bad outcome)

### 5. Flexibility Auto-Inference

Every transaction gets a category (AI-classified by Gemini, user-editable before confirmation), which maps to a flexibility level:

- **none** (must pay): rent, loan_emi, utility, tax
- **medium** (negotiable): supplier_invoice, contractor
- **high** (deferrable): marketing, subscription, misc

---

## Tech Stack

| Component | Tech | Why |
|-----------|------|-----|
| Backend | FastAPI (Python) | Async, auto-generates OpenAPI docs at `/docs` |
| Frontend | React 19 + TypeScript + Tailwind CSS 4 | Type-safe, modern, fast |
| Database | Supabase (PostgreSQL) | Managed, row-level security, storage buckets for docs |
| LLM | Google Gemini Flash 2.5 (Layer 1) + Pro 2.5 (Layer 4) | Flash for fast OCR, Pro for reasoning |
| Testing | pytest — **67 passing tests** | All on deterministic math layers |

---

## Demo Scenarios (3 Pre-Seeded Businesses)

| Business | Cash | Obligations | What Judges Will See |
|----------|------|-------------|---------------------|
| **Riya's Restaurant** | 42,000 | 1,57,700 | Crisis — Baseline goes negative, Smart strategy defers items to survive |
| **Metro Retail Store** | 1,80,000 | 3,02,000 | Stress — Tight cash, Smart strategy optimizes |
| **Apex Consulting** | 5,00,000 | 1,97,000 | Stable — All strategies stay solvent, "Runway Clear" badge |

---

## Suggested Demo Flow (3-4 minutes)

1. **Open Document Intelligence** — show a quick document upload or chat ingest ("paid 15000 to Fresh Farms yesterday") to show how data enters the system
2. **Switch to Cash Flow Forecast** — show Riya's Restaurant: health score in red, days-to-zero, the chart dropping below the zero line
3. **Open Decision Sandbox** — "Cash Shortfall Detected" banner, 3 scenario cards side by side, Baseline goes negative, Smart stays solvent
4. **Click into Action Execution** — show Chain-of-Thought explanation, draft emails with different tones, action checklist
5. **Quick switch to Apex Consulting** (if business switcher is ready) — "Runway Clear", green everywhere, all strategies solvent. Shows the system works across health states.

**Closing line:**
> "Every Indian SME makes payment decisions on gut instinct. Finaxis replaces gut with math — and when negotiation is needed, it drafts the email too."

---

## Likely Judge Questions & Answers

### Architecture & Design

**Q: "Why not just use an LLM for everything?"**
> "LLMs hallucinate. If an LLM says you have 30 days of runway but you actually have 3, that's catastrophic for an SME. Our math layers are deterministic and fully tested — 67 unit tests. LLMs only handle language tasks where creativity is useful, not harmful."

**Q: "How is this different from Tally/Zoho Books?"**
> "Tally records what happened. We predict what's about to happen and tell you what to do about it. We simulate 3 payment strategies, show the trade-offs, and draft the actual emails to negotiate with vendors."

**Q: "Why 3 strategies? Why not just give the best one?"**
> "Business owners need agency. Baseline shows the reality of paying everything. Survival shows the extreme of hoarding cash. Smart finds the optimum. Showing all three builds trust — the user understands *why* Smart is recommended."

---

### Technical Deep-Dives

**Q: "How does the health score work?"**
> "It's a 0-100 composite: up to 50 points from runway days (lookup table), up to 30 from a stress ratio (payables vs. available cash + receivables), and up to 20 from overdue pressure (% of payables past due). Fully deterministic, no ML."

**Q: "How does Smart Penalty Minimization decide what to defer?"**
> "Day-by-day greedy simulation. Each obligation gets a priority score: penalty_rate times amount, divided by a flexibility factor. When cash runs short, we defer the lowest-priority items first — high flexibility, low penalty cost. Critical items like rent and tax are never deferred."

**Q: "What if Gemini hallucinates transaction data?"**
> "Layer 1 is a parsing layer, not a decision layer. Every extracted transaction goes through a human review screen before being confirmed to the database. The user can edit amounts, counterparties, and categories. Nothing touches the financial engine without explicit user confirmation."

**Q: "How do you handle duplicate transactions?"**
> "We check a +/-3 day window for matching counterparty and amount. Potential duplicates are flagged in the UI during review — the user decides whether to keep or discard."

**Q: "How do draft emails know the right tone?"**
> "Each counterparty has a tier: strategic, standard, or flexible. The Gemini Pro prompt includes the tier and relationship notes. Strategic vendors get formal, respectful requests. Flexible vendors get direct rescheduling notices."

---

### Scalability & Production

**Q: "Can this scale?"**
> "The backend is stateless FastAPI — horizontal scaling. Database is Supabase/Postgres. LLM calls only happen at ingestion and recommendation, not on every page load. The math layers are pure Python with zero external calls."

**Q: "What about authentication/multi-tenancy?"**
> "The database schema already has business_id foreign keys on every table. Supabase Auth + Row Level Security is the planned next step — the schema is multi-tenant ready, we scoped auth out of the hackathon MVP."

**Q: "What about data privacy?"**
> "Financial documents are parsed via Gemini API and structured data is stored in Supabase. In production, we'd use Gemini's data governance (no training on user data) and Supabase's SOC2-compliant infrastructure."

---

## Key Numbers to Remember

| Metric | Value |
|--------|-------|
| Unit tests | **67 passing** |
| Test coverage areas | Runway math (26 tests), Decision engine (41 tests) |
| API endpoints | **8** |
| Frontend pages | **5** |
| Database tables | **5** (businesses, transactions, counterparty_profiles, documents, decisions) |
| LLM models used | **2** (Gemini Flash for OCR, Gemini Pro for reasoning) |
| Layers with zero LLM calls | **2 out of 4** (Layer 2 and Layer 3) |

---

## API Endpoints Reference

| Method | Endpoint | Layer | Description |
|--------|----------|-------|-------------|
| POST | `/api/ingest` | 1 | Upload document for Gemini Vision parsing |
| POST | `/api/chat-ingest` | 1 | NLP chat-to-ledger extraction |
| POST | `/api/confirm` | 1 | Persist reviewed transactions to database |
| POST | `/api/runway` | 2 | Compute runway metrics and health score |
| POST | `/api/decide` | 3 | Generate 3 pay/defer scenarios |
| POST | `/api/recommend` | 4 | Generate AI recommendations and draft emails |
| POST | `/api/transactions` | Ledger | List all transactions for a business |
| POST | `/api/transactions/create` | Ledger | Manually add an obligation |

---

## Database Schema (Quick Reference)

- **businesses** — id, name, owner_email, current_cash_balance, health_score
- **transactions** — id, business_id, type (inflow/outflow), counterparty, amount, due_date, status (pending/paid/overdue/deferred), category, flexibility, penalty_rate
- **counterparty_profiles** — id, business_id, name, tier (strategic/standard/flexible), relationship_notes
- **documents** — id, business_id, file_url, document_type, parse_status, parsed_json
- **decisions** — id, business_id, scenario_type, metrics, cot_explanation, action_items, draft_emails

---

*Good luck team. We've built something solid. Lead with "LLM for language, math for money" and let the demo speak for itself.*

# Finaxis — CashFlow Copilot for Indian SMEs

A 4-layer financial decision engine that helps small and medium businesses in India predict cash shortfalls, optimize payment schedules, and negotiate vendor deferrals — built for the SNU Hackathon.

## Core Design Principle

**"LLM for language, math for money."**

Financial calculations are never delegated to an LLM. Layers 2 and 3 are 100% deterministic pure Python math with full unit test coverage. LLMs (Google Gemini) are used only where language understanding is needed: parsing documents (Layer 1) and generating human-readable recommendations (Layer 4).

## The 4 Layers

| Layer | Route | Engine | What It Does |
|-------|-------|--------|--------------|
| **Layer 1** — Document Intelligence | `/api/ingest` | Gemini Flash (Vision) | Parses bank statements, invoices, receipts into structured transactions. Also supports NLP chat entry ("paid 5000 to Farmaan Dealers"). Auto-classifies transaction category and flags duplicates. |
| **Layer 2** — Runway Detection | `/api/runway` | Pure Python Math | Computes days-to-zero, financial health score (0-100), burn rates, horizon projections (7/30/60 day), overdue pressure metrics, concentration risk, and cash flow volatility. |
| **Layer 3** — Decision Sandbox | `/api/decide` | Pure Python Math | Generates 3 deterministic pay/defer strategies (Baseline, Survival, Smart Penalty Minimization) using a greedy day-by-day simulation with flexibility-aware obligation scoring. Recommends the optimal strategy. |
| **Layer 4** — Action & Execution | `/api/recommend` | Gemini Pro | Takes the recommended scenario and generates Chain-of-Thought justification, tone-matched draft negotiation emails (per counterparty tier), and an ordered action checklist. |

## Key Algorithms

### Financial Health Score (Layer 2)

```
score = runway_component (max 50) + stress_component (max 30) + overdue_pressure (max 20)
```

- **Runway**: days_to_zero mapped via lookup table (0d=0pts, 7d=10, 14d=20, 30d=30, 60d=40, 61+=50)
- **Stress**: total_payables / (cash + receivables) — lower ratio = higher score
- **Overdue Pressure**: % of payables that are past due — 0% = 20pts, >50% = 0pts

### Obligation Priority Score (Layer 3)

```
score = (max(penalty_rate, 0.001) * amount) / flexibility_factor
```

| Flexibility | Factor | Effect |
|-------------|--------|--------|
| `none` (rent, tax, loan) | 0.1 | Score x10 — always pay first |
| `medium` (supplier, contractor) | 1.0 | Neutral |
| `high` (marketing, subscription) | 3.0 | Score /3 — defer first |

### Flexibility Auto-Inference

Every transaction gets a category (AI-classified by Gemini, user-editable before confirmation), which maps to a flexibility level:

- **none** (must pay): `rent`, `loan_emi`, `utility`, `tax`
- **medium** (negotiable): `supplier_invoice`, `contractor`
- **high** (deferrable): `marketing`, `subscription`, `misc`

### Smart Penalty Minimization (Layer 3, Strategy C)

Day-by-day greedy simulation:
1. Group obligations by due date, process chronologically
2. If cash covers everything due today — pay all
3. If short — defer highest-flexibility / lowest-penalty items by 15 days
4. `none`-flexibility items are never deferred
5. Each item can be deferred at most once
6. Penalty per deferral: `penalty_rate * amount * 15 days`

### Recommendation Engine (Layer 3)

1. Filter to **viable** strategies (min_balance >= 0)
2. Among viable — pick lowest total_penalties
3. If all go negative — pick highest min_balance (least-bad outcome)

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Python, FastAPI |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4 |
| Database | Supabase (PostgreSQL) |
| LLM | Google Gemini (Flash for OCR/NLP, Pro for reasoning) |
| Testing | pytest (67 deterministic unit tests) |

## Project Structure

```
SNU-Hacks/
├── server/
│   ├── main.py                    # FastAPI app, CORS, router registration
│   ├── controllers/               # Route handlers (one per API layer)
│   │   ├── ingest_controller.py
│   │   ├── runway_controller.py
│   │   ├── decide_controller.py
│   │   ├── recommend_controller.py
│   │   └── transactions_controller.py
│   ├── services/                  # Business logic
│   │   ├── ingest_service.py      # Gemini Vision document parsing
│   │   ├── chat_ingest_service.py # NLP chat-to-ledger
│   │   ├── confirm_service.py     # Transaction persistence
│   │   ├── runway_service.py      # Deterministic runway math
│   │   ├── decide_service.py      # 3-strategy scenario engine
│   │   └── recommend_service.py   # Gemini Pro CoT + emails
│   ├── models/                    # Pydantic data models
│   ├── core/                      # Supabase/Gemini clients, config
│   ├── utils/                     # Flexibility inference, helpers
│   └── tests/                     # Unit tests (test_runway, test_decide)
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── DocumentIntelligence.tsx   # Layer 1 UI
│       │   ├── CashFlowForecast.tsx       # Layer 2 UI
│       │   ├── DecisionSandbox.tsx        # Layer 3 UI
│       │   ├── ActionExecution.tsx        # Layer 4 UI
│       │   └── ObligationsLedger.tsx      # Transaction ledger
│       ├── services/              # API client modules
│       └── components/            # Layout, shared components
└── supabase/
    ├── migrations/                # Schema migrations
    └── seed.sql                   # Demo data (3 business profiles)
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Supabase project (or local via Docker)

### Environment Variables

Create `server/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

### Backend Setup

```bash
cd server
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`

### Database Setup

1. Run the migrations in `supabase/migrations/` against your Supabase project (in order)
2. Run `supabase/seed.sql` in the Supabase SQL Editor to load demo data

### Run Tests

```bash
cd server
pytest -v
```

## Demo Scenarios

Three pre-seeded business profiles for reliable demonstration:

| Business | Cash | Obligations | Mode |
|----------|------|-------------|------|
| Riya's Restaurant | 42,000 | 1,57,700 | Crisis — cash shortfall in <7 days |
| Metro Retail Store | 1,80,000 | 3,02,000 | Stress — obligations exceed cash over 30 days |
| Apex Consulting | 5,00,000 | 1,97,000 | Stable — 45+ day comfortable runway |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ingest` | Upload document for Gemini Vision parsing |
| POST | `/api/chat-ingest` | NLP chat-to-ledger extraction |
| POST | `/api/confirm` | Persist reviewed transactions to database |
| POST | `/api/runway` | Compute runway metrics and health score |
| POST | `/api/decide` | Generate 3 pay/defer scenarios |
| POST | `/api/recommend` | Generate AI recommendations and draft emails |
| POST | `/api/transactions` | List all transactions for a business |
| POST | `/api/transactions/create` | Manually add an obligation |

All endpoints accept `{ "business_id": "uuid" }` in the request body.

## Architecture Diagram

```
Document/Chat ──► [Layer 1: Gemini Flash] ──► Structured Transactions ──► Supabase
                                                        │
Business Cash + Transactions ──► [Layer 2: Pure Math] ──► Health Score, Days-to-Zero, Burn Rates
                                                        │
Pending Obligations ──► [Layer 3: Pure Math] ──► 3 Scenarios + Recommendation
                                                        │
Chosen Scenario + Profiles ──► [Layer 4: Gemini Pro] ──► CoT + Emails + Checklist
```

## Built With

Built for the **SNU Hackathon** by Team Finaxis.

# Setup Guide — CashFlow Copilot Backend

Complete this guide **once** before running any layer tests. Layers 2 and 3 only need Supabase. Layers 1 and 4 additionally need a Gemini API key.

---

## 1. Environment Variables

Copy the example file and fill in your credentials:

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

**Where to find these:**
- `SUPABASE_URL` and `SUPABASE_KEY` (anon/public key): **Supabase Dashboard → Project Settings → API**
- `GEMINI_API_KEY`: **Google AI Studio → Get API Key**

---

## 2. Supabase Table Migrations

Go to **Supabase Dashboard → SQL Editor** and run the following SQL in one shot:

```sql
-- Enum types
CREATE TYPE transaction_type_enum     AS ENUM ('inflow', 'outflow');
CREATE TYPE transaction_status_enum   AS ENUM ('pending', 'paid', 'overdue', 'deferred');
CREATE TYPE transaction_category_enum AS ENUM ('payable', 'receivable', 'expense');
CREATE TYPE flexibility_enum          AS ENUM ('none', 'medium', 'high');
CREATE TYPE source_enum               AS ENUM ('manual', 'bank_statement', 'invoice', 'receipt');
CREATE TYPE document_type_enum        AS ENUM ('bank_statement', 'invoice', 'receipt');
CREATE TYPE parse_status_enum         AS ENUM ('pending', 'parsed', 'confirmed', 'failed');
CREATE TYPE counterparty_tier_enum    AS ENUM ('strategic', 'standard', 'flexible');

-- businesses
CREATE TABLE businesses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  owner_email           TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  current_cash_balance  DECIMAL NOT NULL DEFAULT 0,
  financial_health_score INT
);

-- transactions
CREATE TABLE transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID REFERENCES businesses(id) ON DELETE CASCADE,
  type             transaction_type_enum NOT NULL,
  counterparty     TEXT NOT NULL,
  amount           DECIMAL NOT NULL,
  due_date         DATE NOT NULL,
  status           transaction_status_enum NOT NULL DEFAULT 'pending',
  category         transaction_category_enum,
  flexibility      flexibility_enum,
  penalty_rate     DECIMAL DEFAULT 0,
  source           source_enum DEFAULT 'manual',
  raw_document_id  UUID,
  notes            TEXT
);

-- counterparty_profiles
CREATE TABLE counterparty_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  tier                counterparty_tier_enum NOT NULL DEFAULT 'standard',
  relationship_notes  TEXT,
  total_outstanding   DECIMAL DEFAULT 0
);

-- documents
CREATE TABLE documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID REFERENCES businesses(id) ON DELETE CASCADE,
  file_url       TEXT,
  document_type  document_type_enum,
  parse_status   parse_status_enum DEFAULT 'pending',
  parsed_json    JSONB,
  uploaded_at    TIMESTAMPTZ DEFAULT now()
);

-- decisions
CREATE TABLE decisions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID REFERENCES businesses(id) ON DELETE CASCADE,
  generated_at          TIMESTAMPTZ DEFAULT now(),
  scenario_type         TEXT,
  days_to_zero_before   INT,
  days_to_zero_after    INT,
  total_penalty_saved   DECIMAL,
  cot_explanation       TEXT,
  action_items          JSONB,
  draft_emails          JSONB
);
```

---

## 3. Seed Demo Data

Still in SQL Editor, run this to insert the **Crisis Mode** demo scenario (Riya's Restaurant):

```sql
-- Business
INSERT INTO businesses (id, name, owner_email, current_cash_balance)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Riya''s Restaurant',
  'riya@example.com',
  42000
);

-- Rent: due in 3 days, must-pay, high penalty
INSERT INTO transactions (business_id, type, counterparty, amount, due_date, status, category, flexibility, penalty_rate)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'outflow', 'Property Owner - MG Road', 60000,
  CURRENT_DATE + INTERVAL '3 days',
  'pending', 'payable', 'none', 0.05
);

-- Supplier bill: due in 5 days, negotiable
INSERT INTO transactions (business_id, type, counterparty, amount, due_date, status, category, flexibility, penalty_rate)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'outflow', 'BuildMart Supplies', 28000,
  CURRENT_DATE + INTERVAL '5 days',
  'pending', 'payable', 'medium', 0.02
);

-- Customer receivable: due in 10 days (inflow)
INSERT INTO transactions (business_id, type, counterparty, amount, due_date, status, category, flexibility, penalty_rate)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'inflow', 'Taj Catering Services', 50000,
  CURRENT_DATE + INTERVAL '10 days',
  'pending', 'receivable', 'none', 0
);

-- Counterparty profiles (used by Layer 4 for email tone)
INSERT INTO counterparty_profiles (business_id, name, tier, relationship_notes)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Property Owner - MG Road', 'strategic', 'Landlord for 5 years. Critical relationship.'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'BuildMart Supplies',       'standard',  'Regular monthly supplier.'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Taj Catering Services',    'standard',  'Large corporate client, pays on time.');
```

> **Remember this business ID:** `aaaaaaaa-0000-0000-0000-000000000001`
> You will use it in every API call across all 4 layers.

---

## 4. Supabase Storage Bucket

> Required only for **Layer 1 (Ingest)**. Skip if you are only testing Layers 2, 3, or 4.

1. Go to **Supabase Dashboard → Storage**
2. Click **New bucket**
3. Name: `documents`
4. Visibility: **Public**
5. Click **Create bucket**

---

## 5. Install Dependencies and Start the Server

```bash
cd server
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Confirm it is running by opening: `http://localhost:8000/docs`

You should see Swagger UI listing four routes:
- `POST /api/ingest`
- `POST /api/runway`
- `POST /api/decide`
- `POST /api/recommend`

---

## 6. Recommended Test Order

| Order | File | Layer | Needs Gemini? |
|---|---|---|---|
| 1 | `01_layer2_runway.md` | Runway Detection | No |
| 2 | `02_layer3_decide.md` | Decision Sandbox | No |
| 3 | `03_layer4_recommend.md` | Recommendation Engine | Yes |
| 4 | `04_layer1_ingest.md` | Document Ingestion | Yes |

Test Layers 2 and 3 first — they are pure math and confirm your Supabase connection is working before you touch Gemini.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `APIError` on startup or first request | Table does not exist | Re-run the migration SQL |
| `single() returned no rows` | business_id not in DB | Confirm the seed data ran successfully |
| `Connection refused` | Server not running | Run the `uvicorn` command from the `server/` directory |
| `401 Unauthorized` from Supabase | Wrong `SUPABASE_KEY` | Use the **anon/public** key, not the service-role key |
| Gemini `PermissionDenied` | Invalid API key | Check `GEMINI_API_KEY` in `.env` |

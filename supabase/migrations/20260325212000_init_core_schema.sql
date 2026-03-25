-- CashFlow Copilot core schema
-- Safe to run via `supabase db push` on a fresh hosted project.

create extension if not exists pgcrypto;

-- Enum types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type_enum') THEN
    CREATE TYPE transaction_type_enum AS ENUM ('inflow', 'outflow');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status_enum') THEN
    CREATE TYPE transaction_status_enum AS ENUM ('pending', 'paid', 'overdue', 'deferred');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_category_enum') THEN
    CREATE TYPE transaction_category_enum AS ENUM ('payable', 'receivable', 'expense');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'flexibility_enum') THEN
    CREATE TYPE flexibility_enum AS ENUM ('none', 'medium', 'high');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'source_enum') THEN
    CREATE TYPE source_enum AS ENUM ('manual', 'bank_statement', 'invoice', 'receipt');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type_enum') THEN
    CREATE TYPE document_type_enum AS ENUM ('bank_statement', 'invoice', 'receipt');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'parse_status_enum') THEN
    CREATE TYPE parse_status_enum AS ENUM ('pending', 'parsed', 'confirmed', 'failed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'counterparty_tier_enum') THEN
    CREATE TYPE counterparty_tier_enum AS ENUM ('strategic', 'standard', 'flexible');
  END IF;
END
$$;

-- businesses
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_cash_balance NUMERIC NOT NULL DEFAULT 0,
  financial_health_score INT
);

-- transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  type transaction_type_enum NOT NULL,
  counterparty TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status transaction_status_enum NOT NULL DEFAULT 'pending',
  category transaction_category_enum,
  flexibility flexibility_enum,
  penalty_rate NUMERIC DEFAULT 0,
  source source_enum DEFAULT 'manual',
  raw_document_id UUID,
  notes TEXT
);

-- counterparty_profiles
CREATE TABLE IF NOT EXISTS public.counterparty_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tier counterparty_tier_enum NOT NULL DEFAULT 'standard',
  relationship_notes TEXT,
  total_outstanding NUMERIC DEFAULT 0
);

-- documents
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  file_url TEXT,
  document_type document_type_enum,
  parse_status parse_status_enum DEFAULT 'pending',
  parsed_json JSONB,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- decisions
CREATE TABLE IF NOT EXISTS public.decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scenario_type TEXT,
  days_to_zero_before INT,
  days_to_zero_after INT,
  total_penalty_saved NUMERIC,
  cot_explanation TEXT,
  action_items JSONB,
  draft_emails JSONB
);

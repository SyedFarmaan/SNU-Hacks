-- Performance indexes + hackathon-friendly RLS policies.

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_business_status_due
  ON public.transactions (business_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_transactions_business_type_status
  ON public.transactions (business_id, type, status);

CREATE INDEX IF NOT EXISTS idx_counterparty_profiles_business_name
  ON public.counterparty_profiles (business_id, name);

CREATE INDEX IF NOT EXISTS idx_documents_business_uploaded
  ON public.documents (business_id, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_decisions_business_generated
  ON public.decisions (business_id, generated_at DESC);

-- RLS (open policies for hackathon velocity; tighten before production)
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counterparty_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS businesses_all_access ON public.businesses;
CREATE POLICY businesses_all_access
  ON public.businesses
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS transactions_all_access ON public.transactions;
CREATE POLICY transactions_all_access
  ON public.transactions
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS counterparty_profiles_all_access ON public.counterparty_profiles;
CREATE POLICY counterparty_profiles_all_access
  ON public.counterparty_profiles
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS documents_all_access ON public.documents;
CREATE POLICY documents_all_access
  ON public.documents
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS decisions_all_access ON public.decisions;
CREATE POLICY decisions_all_access
  ON public.decisions
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

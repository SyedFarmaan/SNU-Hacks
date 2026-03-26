-- Fix: change category from restrictive enum ('payable','receivable','expense')
-- to TEXT so it accepts application-level categories like 'rent', 'loan_emi',
-- 'utility', 'tax', 'supplier_invoice', 'contractor', 'marketing',
-- 'subscription', 'misc'.

ALTER TABLE public.transactions
  ALTER COLUMN category TYPE TEXT USING category::TEXT;

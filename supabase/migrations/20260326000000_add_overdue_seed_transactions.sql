-- Migration: Add overdue transactions to demo seed scenarios
-- Purpose: Enables testing of overdue_receivables_pct, overdue_payables_pct
--          and overdue pressure component of the health score in Layer 2.
-- Safe to run on top of the existing seed data (all conflicts are handled).

-- Crisis Mode (Riya's Restaurant): 2 overdue obligations
-- Simulates a real SME situation where some bills are already past due
INSERT INTO public.transactions (id, business_id, type, counterparty, amount, due_date, status, category, flexibility, penalty_rate, source)
VALUES
  -- Overdue payable: electricity bill that was not paid last week
  (
    '11111111-1111-1111-1111-111111111110',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'outflow',
    'City Power Distribution',
    12000,
    CURRENT_DATE - INTERVAL '7 days',
    'overdue',
    'payable',
    'none',
    0.02,
    'manual'
  ),
  -- Overdue receivable: a customer invoice from 2 weeks ago still unpaid
  (
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'inflow',
    'Homestead Caterers',
    18000,
    CURRENT_DATE - INTERVAL '14 days',
    'overdue',
    'receivable',
    'none',
    0,
    'manual'
  )
ON CONFLICT (id)
DO UPDATE SET
  business_id   = EXCLUDED.business_id,
  type          = EXCLUDED.type,
  counterparty  = EXCLUDED.counterparty,
  amount        = EXCLUDED.amount,
  due_date      = EXCLUDED.due_date,
  status        = EXCLUDED.status,
  category      = EXCLUDED.category,
  flexibility   = EXCLUDED.flexibility,
  penalty_rate  = EXCLUDED.penalty_rate,
  source        = EXCLUDED.source;

-- Stress Mode (Metro Retail Store): 1 overdue payable
INSERT INTO public.transactions (id, business_id, type, counterparty, amount, due_date, status, category, flexibility, penalty_rate, source)
VALUES
  (
    '22222222-2222-2222-2222-222222222210',
    'bbbbbbbb-0000-0000-0000-000000000002',
    'outflow',
    'Freight Logistics Pvt Ltd',
    22000,
    CURRENT_DATE - INTERVAL '5 days',
    'overdue',
    'payable',
    'medium',
    0.015,
    'manual'
  )
ON CONFLICT (id)
DO UPDATE SET
  business_id   = EXCLUDED.business_id,
  type          = EXCLUDED.type,
  counterparty  = EXCLUDED.counterparty,
  amount        = EXCLUDED.amount,
  due_date      = EXCLUDED.due_date,
  status        = EXCLUDED.status,
  category      = EXCLUDED.category,
  flexibility   = EXCLUDED.flexibility,
  penalty_rate  = EXCLUDED.penalty_rate,
  source        = EXCLUDED.source;

-- Apex Consulting: no overdue transactions (healthy scenario, overdue_pct should be 0)

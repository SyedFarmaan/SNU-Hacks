-- CashFlow Copilot demo seed data
-- Idempotent inserts for 3 hackathon scenarios.

-- Businesses
INSERT INTO public.businesses (id, name, owner_email, current_cash_balance)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Riya''s Restaurant', 'riya@example.com', 42000),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Metro Retail Store', 'metro@example.com', 180000),
  ('cccccccc-0000-0000-0000-000000000003', 'Apex Consulting', 'apex@example.com', 500000)
ON CONFLICT (id)
DO UPDATE SET
  name = EXCLUDED.name,
  owner_email = EXCLUDED.owner_email,
  current_cash_balance = EXCLUDED.current_cash_balance;

-- Crisis Mode: Riya's Restaurant
INSERT INTO public.transactions (id, business_id, type, counterparty, amount, due_date, status, category, flexibility, penalty_rate, source)
VALUES
  ('11111111-1111-1111-1111-111111111101', 'aaaaaaaa-0000-0000-0000-000000000001', 'outflow', 'Property Owner - MG Road', 60000, CURRENT_DATE + INTERVAL '3 days', 'pending', 'payable', 'none', 0.05, 'manual'),
  ('11111111-1111-1111-1111-111111111102', 'aaaaaaaa-0000-0000-0000-000000000001', 'outflow', 'BuildMart Supplies', 28000, CURRENT_DATE + INTERVAL '5 days', 'pending', 'payable', 'medium', 0.02, 'manual'),
  ('11111111-1111-1111-1111-111111111103', 'aaaaaaaa-0000-0000-0000-000000000001', 'inflow', 'Taj Catering Services', 50000, CURRENT_DATE + INTERVAL '10 days', 'pending', 'receivable', 'none', 0, 'manual')
ON CONFLICT (id)
DO UPDATE SET
  business_id = EXCLUDED.business_id,
  type = EXCLUDED.type,
  counterparty = EXCLUDED.counterparty,
  amount = EXCLUDED.amount,
  due_date = EXCLUDED.due_date,
  status = EXCLUDED.status,
  category = EXCLUDED.category,
  flexibility = EXCLUDED.flexibility,
  penalty_rate = EXCLUDED.penalty_rate,
  source = EXCLUDED.source;

INSERT INTO public.counterparty_profiles (id, business_id, name, tier, relationship_notes)
VALUES
  ('21111111-1111-1111-1111-111111111101', 'aaaaaaaa-0000-0000-0000-000000000001', 'Property Owner - MG Road', 'strategic', 'Landlord for 5 years. Critical relationship.'),
  ('21111111-1111-1111-1111-111111111102', 'aaaaaaaa-0000-0000-0000-000000000001', 'BuildMart Supplies', 'standard', 'Regular monthly supplier.'),
  ('21111111-1111-1111-1111-111111111103', 'aaaaaaaa-0000-0000-0000-000000000001', 'Taj Catering Services', 'standard', 'Large corporate client, pays on time.')
ON CONFLICT (id)
DO UPDATE SET
  business_id = EXCLUDED.business_id,
  name = EXCLUDED.name,
  tier = EXCLUDED.tier,
  relationship_notes = EXCLUDED.relationship_notes;

-- Stress Mode: Metro Retail Store
INSERT INTO public.transactions (id, business_id, type, counterparty, amount, due_date, status, category, flexibility, penalty_rate, source)
VALUES
  ('22222222-2222-2222-2222-222222222201', 'bbbbbbbb-0000-0000-0000-000000000002', 'outflow', 'Main Warehouse Rent', 90000, CURRENT_DATE + INTERVAL '7 days', 'pending', 'payable', 'none', 0.03, 'manual'),
  ('22222222-2222-2222-2222-222222222202', 'bbbbbbbb-0000-0000-0000-000000000002', 'outflow', 'Wholesale Textiles Co.', 75000, CURRENT_DATE + INTERVAL '12 days', 'pending', 'payable', 'medium', 0.015, 'manual'),
  ('22222222-2222-2222-2222-222222222203', 'bbbbbbbb-0000-0000-0000-000000000002', 'outflow', 'Digital Ads Agency', 45000, CURRENT_DATE + INTERVAL '20 days', 'pending', 'expense', 'high', 0.0, 'manual'),
  ('22222222-2222-2222-2222-222222222204', 'bbbbbbbb-0000-0000-0000-000000000002', 'outflow', 'Utility Provider', 30000, CURRENT_DATE + INTERVAL '25 days', 'pending', 'expense', 'none', 0.01, 'manual'),
  ('22222222-2222-2222-2222-222222222205', 'bbbbbbbb-0000-0000-0000-000000000002', 'inflow', 'Festival Bulk Order', 60000, CURRENT_DATE + INTERVAL '15 days', 'pending', 'receivable', 'none', 0, 'manual')
ON CONFLICT (id)
DO UPDATE SET
  business_id = EXCLUDED.business_id,
  type = EXCLUDED.type,
  counterparty = EXCLUDED.counterparty,
  amount = EXCLUDED.amount,
  due_date = EXCLUDED.due_date,
  status = EXCLUDED.status,
  category = EXCLUDED.category,
  flexibility = EXCLUDED.flexibility,
  penalty_rate = EXCLUDED.penalty_rate,
  source = EXCLUDED.source;

-- Stable Mode: Apex Consulting
INSERT INTO public.transactions (id, business_id, type, counterparty, amount, due_date, status, category, flexibility, penalty_rate, source)
VALUES
  ('33333333-3333-3333-3333-333333333301', 'cccccccc-0000-0000-0000-000000000003', 'outflow', 'Office Lease', 70000, CURRENT_DATE + INTERVAL '15 days', 'pending', 'payable', 'none', 0.01, 'manual'),
  ('33333333-3333-3333-3333-333333333302', 'cccccccc-0000-0000-0000-000000000003', 'outflow', 'Cloud Services Vendor', 35000, CURRENT_DATE + INTERVAL '22 days', 'pending', 'expense', 'high', 0.0, 'manual'),
  ('33333333-3333-3333-3333-333333333303', 'cccccccc-0000-0000-0000-000000000003', 'inflow', 'Enterprise Client - Q2 Milestone', 220000, CURRENT_DATE + INTERVAL '10 days', 'pending', 'receivable', 'none', 0, 'manual'),
  ('33333333-3333-3333-3333-333333333304', 'cccccccc-0000-0000-0000-000000000003', 'inflow', 'Retainer Payment', 140000, CURRENT_DATE + INTERVAL '28 days', 'pending', 'receivable', 'none', 0, 'manual')
ON CONFLICT (id)
DO UPDATE SET
  business_id = EXCLUDED.business_id,
  type = EXCLUDED.type,
  counterparty = EXCLUDED.counterparty,
  amount = EXCLUDED.amount,
  due_date = EXCLUDED.due_date,
  status = EXCLUDED.status,
  category = EXCLUDED.category,
  flexibility = EXCLUDED.flexibility,
  penalty_rate = EXCLUDED.penalty_rate,
  source = EXCLUDED.source;

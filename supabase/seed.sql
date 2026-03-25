-- ============================================================================
-- CashFlow Copilot — Full Demo Seed Data
-- ============================================================================
-- Idempotent (ON CONFLICT … DO UPDATE) — safe to re-run at any time.
-- All due_dates use CURRENT_DATE + INTERVAL so the demo always shows
-- realistic "near-future" obligations regardless of when you seed.
--
-- Three businesses, three scenarios:
--   1. Riya's Restaurant    — Crisis Mode  (cash < near-term obligations)
--   2. Metro Retail Store    — Stress Mode  (obligations > cash over 30 days)
--   3. Apex Consulting       — Stable Mode  (45+ day comfortable runway)
-- ============================================================================

-- ─── BUSINESSES ─────────────────────────────────────────────────────────────

INSERT INTO public.businesses (id, name, owner_email, current_cash_balance, financial_health_score)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Riya''s Restaurant',  'riya@example.com',  42000,  NULL),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Metro Retail Store',  'metro@example.com', 180000, NULL),
  ('cccccccc-0000-0000-0000-000000000003', 'Apex Consulting',     'apex@example.com',  500000, NULL)
ON CONFLICT (id) DO UPDATE SET
  name                   = EXCLUDED.name,
  owner_email            = EXCLUDED.owner_email,
  current_cash_balance   = EXCLUDED.current_cash_balance,
  financial_health_score = EXCLUDED.financial_health_score;


-- ==========================================================================
-- 🔴 CRISIS MODE — Riya's Restaurant
-- ==========================================================================
-- Cash: ₹42,000
-- Pending outflows: ₹1,57,700 due within 14 days
-- Pending inflows:  ₹85,000 due within 15 days
-- Overdue:          ₹12,000 payable + ₹18,000 receivable
--
-- This creates genuine crisis: balance goes negative by day 3 in Baseline.
-- Layer 3 scenarios diverge meaningfully:
--   Baseline:  min_balance ≈ -₹76,200 (everything paid, cash tanks)
--   Survival:  defers ₹69,200 → min_balance ≈ -₹26,500 (still negative)
--   Smart:     selectively defers cheapest items → best penalty/balance ratio

INSERT INTO public.transactions (id, business_id, type, counterparty, amount, due_date, status, category, flexibility, penalty_rate, source, notes)
VALUES
  -- ── Pending outflows (payables) ──
  ('11111111-1111-1111-1111-111111111101',
   'aaaaaaaa-0000-0000-0000-000000000001', 'outflow',
   'Property Owner - MG Road', 60000,
   CURRENT_DATE + INTERVAL '3 days', 'pending', 'payable', 'none', 0.05,
   'manual', 'Monthly rent for restaurant premises. Strict landlord.'),

  ('11111111-1111-1111-1111-111111111102',
   'aaaaaaaa-0000-0000-0000-000000000001', 'outflow',
   'BuildMart Supplies', 28000,
   CURRENT_DATE + INTERVAL '5 days', 'pending', 'payable', 'medium', 0.02,
   'manual', 'Kitchen equipment and cleaning supplies order.'),

  ('11111111-1111-1111-1111-111111111104',
   'aaaaaaaa-0000-0000-0000-000000000001', 'outflow',
   'City Power Utility', 8500,
   CURRENT_DATE + INTERVAL '7 days', 'pending', 'payable', 'none', 0.03,
   'manual', 'Monthly electricity bill. Disconnection risk if late.'),

  ('11111111-1111-1111-1111-111111111105',
   'aaaaaaaa-0000-0000-0000-000000000001', 'outflow',
   'CloudKitchen SaaS', 4200,
   CURRENT_DATE + INTERVAL '4 days', 'pending', 'payable', 'high', 0.0,
   'manual', 'POS system monthly subscription. Can skip a month.'),

  ('11111111-1111-1111-1111-111111111106',
   'aaaaaaaa-0000-0000-0000-000000000001', 'outflow',
   'Digital Media Agency', 15000,
   CURRENT_DATE + INTERVAL '12 days', 'pending', 'payable', 'high', 0.005,
   'manual', 'Instagram + Zomato ad campaign. Deferrable.'),

  ('11111111-1111-1111-1111-111111111107',
   'aaaaaaaa-0000-0000-0000-000000000001', 'outflow',
   'Fresh Produce Wholesale', 22000,
   CURRENT_DATE + INTERVAL '6 days', 'pending', 'payable', 'medium', 0.01,
   'manual', 'Weekly vegetable and meat order from Mandi.'),

  ('11111111-1111-1111-1111-111111111108',
   'aaaaaaaa-0000-0000-0000-000000000001', 'outflow',
   'Gas Supply Co', 8000,
   CURRENT_DATE + INTERVAL '8 days', 'pending', 'payable', 'none', 0.02,
   'manual', 'Commercial LPG cylinder refill. Essential for kitchen ops.'),

  ('11111111-1111-1111-1111-111111111109',
   'aaaaaaaa-0000-0000-0000-000000000001', 'outflow',
   'Staff Salary - Cooks', 12000,
   CURRENT_DATE + INTERVAL '2 days', 'pending', 'payable', 'none', 0.0,
   'manual', 'Bi-weekly salary for 2 line cooks. Non-negotiable.'),

  -- ── Pending inflows (receivables) ──
  ('11111111-1111-1111-1111-111111111103',
   'aaaaaaaa-0000-0000-0000-000000000001', 'inflow',
   'Taj Catering Services', 50000,
   CURRENT_DATE + INTERVAL '10 days', 'pending', 'receivable', 'none', 0,
   'manual', 'Corporate lunch contract - March invoice.'),

  ('11111111-1111-1111-1111-111111111112',
   'aaaaaaaa-0000-0000-0000-000000000001', 'inflow',
   'Weekend Banquet - Sharma Family', 35000,
   CURRENT_DATE + INTERVAL '14 days', 'pending', 'receivable', 'none', 0,
   'manual', 'Advance for 50-person engagement party.'),

  -- ── Overdue transactions ──
  ('11111111-1111-1111-1111-111111111110',
   'aaaaaaaa-0000-0000-0000-000000000001', 'outflow',
   'City Power Distribution', 12000,
   CURRENT_DATE - INTERVAL '7 days', 'overdue', 'payable', 'none', 0.02,
   'manual', 'Last month electricity bill - overdue notice received.'),

  ('11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-0000-0000-0000-000000000001', 'inflow',
   'Homestead Caterers', 18000,
   CURRENT_DATE - INTERVAL '14 days', 'overdue', 'receivable', 'none', 0,
   'manual', 'Pending payment for catering sub-contract work.'),

  -- ── Paid (historical — for accounting, ignored by Layer 2/3) ──
  ('11111111-1111-1111-1111-111111111120',
   'aaaaaaaa-0000-0000-0000-000000000001', 'outflow',
   'Spice Traders India', 9500,
   CURRENT_DATE - INTERVAL '10 days', 'paid', 'payable', 'medium', 0.0,
   'manual', 'Monthly spice order - paid on time.'),

  ('11111111-1111-1111-1111-111111111121',
   'aaaaaaaa-0000-0000-0000-000000000001', 'inflow',
   'Walk-in Daily Revenue', 28000,
   CURRENT_DATE - INTERVAL '3 days', 'paid', 'receivable', 'none', 0.0,
   'manual', 'Last week dine-in + delivery revenue collected.')

ON CONFLICT (id) DO UPDATE SET
  business_id  = EXCLUDED.business_id,
  type         = EXCLUDED.type,
  counterparty = EXCLUDED.counterparty,
  amount       = EXCLUDED.amount,
  due_date     = EXCLUDED.due_date,
  status       = EXCLUDED.status,
  category     = EXCLUDED.category,
  flexibility  = EXCLUDED.flexibility,
  penalty_rate = EXCLUDED.penalty_rate,
  source       = EXCLUDED.source,
  notes        = EXCLUDED.notes;

-- Counterparty profiles for Layer 4 email tone
INSERT INTO public.counterparty_profiles (id, business_id, name, tier, relationship_notes, total_outstanding)
VALUES
  ('21111111-1111-1111-1111-111111111101', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Property Owner - MG Road', 'strategic',
   'Landlord for 5 years. Critical relationship — losing the lease would shut down the business.', 60000),
  ('21111111-1111-1111-1111-111111111102', 'aaaaaaaa-0000-0000-0000-000000000001',
   'BuildMart Supplies', 'standard',
   'Regular monthly supplier. Professional relationship, usually flexible on 7-day extensions.', 28000),
  ('21111111-1111-1111-1111-111111111103', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Taj Catering Services', 'strategic',
   'Largest corporate client. 3-year contract, pays reliably. Must not damage this relationship.', 0),
  ('21111111-1111-1111-1111-111111111104', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Fresh Produce Wholesale', 'standard',
   'Weekly Mandi supplier. Alternative suppliers available but quality varies.', 22000),
  ('21111111-1111-1111-1111-111111111105', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Digital Media Agency', 'flexible',
   'Month-to-month marketing contract. Can pause campaigns at any time.', 15000),
  ('21111111-1111-1111-1111-111111111106', 'aaaaaaaa-0000-0000-0000-000000000001',
   'CloudKitchen SaaS', 'flexible',
   'SaaS subscription — grace period on payments, can downgrade plan.', 4200),
  ('21111111-1111-1111-1111-111111111107', 'aaaaaaaa-0000-0000-0000-000000000001',
   'City Power Utility', 'strategic',
   'Government utility. Cannot negotiate but disconnection process takes 15 days.', 20500),
  ('21111111-1111-1111-1111-111111111108', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Gas Supply Co', 'standard',
   'Industrial gas supplier. 5-day advance notice required for refills.', 8000)
ON CONFLICT (id) DO UPDATE SET
  business_id        = EXCLUDED.business_id,
  name               = EXCLUDED.name,
  tier               = EXCLUDED.tier,
  relationship_notes = EXCLUDED.relationship_notes,
  total_outstanding  = EXCLUDED.total_outstanding;


-- ==========================================================================
-- 🟡 STRESS MODE — Metro Retail Store
-- ==========================================================================
-- Cash: ₹1,80,000
-- Pending outflows: ₹3,02,000 over 30 days
-- Pending inflows:  ₹1,25,000 over 30 days
-- Overdue:          ₹22,000 payable
--
-- Not immediately critical, but obligations exceed cash.
-- Layer 2 shows days_to_zero around 12-15 days, health score ~40-55.

INSERT INTO public.transactions (id, business_id, type, counterparty, amount, due_date, status, category, flexibility, penalty_rate, source, notes)
VALUES
  ('22222222-2222-2222-2222-222222222201',
   'bbbbbbbb-0000-0000-0000-000000000002', 'outflow',
   'Main Warehouse Rent', 90000,
   CURRENT_DATE + INTERVAL '7 days', 'pending', 'payable', 'none', 0.03,
   'manual', 'Warehouse lease — 3-year contract with strict terms.'),

  ('22222222-2222-2222-2222-222222222202',
   'bbbbbbbb-0000-0000-0000-000000000002', 'outflow',
   'Wholesale Textiles Co', 75000,
   CURRENT_DATE + INTERVAL '12 days', 'pending', 'payable', 'medium', 0.015,
   'manual', 'Bulk fabric order for summer collection.'),

  ('22222222-2222-2222-2222-222222222203',
   'bbbbbbbb-0000-0000-0000-000000000002', 'outflow',
   'Digital Ads Agency', 45000,
   CURRENT_DATE + INTERVAL '20 days', 'pending', 'payable', 'high', 0.0,
   'manual', 'Social media campaign — can pause without penalty.'),

  ('22222222-2222-2222-2222-222222222204',
   'bbbbbbbb-0000-0000-0000-000000000002', 'outflow',
   'Municipal Utility Board', 30000,
   CURRENT_DATE + INTERVAL '25 days', 'pending', 'payable', 'none', 0.01,
   'manual', 'Quarterly electricity + water bill for the store.'),

  ('22222222-2222-2222-2222-222222222206',
   'bbbbbbbb-0000-0000-0000-000000000002', 'outflow',
   'ShopEase POS License', 12000,
   CURRENT_DATE + INTERVAL '10 days', 'pending', 'payable', 'high', 0.0,
   'manual', 'Annual POS software renewal. Can delay 1 month.'),

  ('22222222-2222-2222-2222-222222222207',
   'bbbbbbbb-0000-0000-0000-000000000002', 'outflow',
   'Delivery Partner Fleet', 25000,
   CURRENT_DATE + INTERVAL '15 days', 'pending', 'payable', 'medium', 0.01,
   'manual', 'Monthly payout to last-mile delivery riders.'),

  ('22222222-2222-2222-2222-222222222208',
   'bbbbbbbb-0000-0000-0000-000000000002', 'outflow',
   'Staff Salaries', 25000,
   CURRENT_DATE + INTERVAL '5 days', 'pending', 'payable', 'none', 0.0,
   'manual', 'Monthly salaries for 3 store assistants.'),

  -- ── Pending inflows ──
  ('22222222-2222-2222-2222-222222222205',
   'bbbbbbbb-0000-0000-0000-000000000002', 'inflow',
   'Festival Bulk Order', 60000,
   CURRENT_DATE + INTERVAL '15 days', 'pending', 'receivable', 'none', 0,
   'manual', 'Pre-booked Diwali hamper order from corporate client.'),

  ('22222222-2222-2222-2222-222222222209',
   'bbbbbbbb-0000-0000-0000-000000000002', 'inflow',
   'Online Marketplace Settlement', 40000,
   CURRENT_DATE + INTERVAL '8 days', 'pending', 'receivable', 'none', 0,
   'manual', 'Fortnightly payout from Flipkart seller account.'),

  ('22222222-2222-2222-2222-222222222211',
   'bbbbbbbb-0000-0000-0000-000000000002', 'inflow',
   'Walk-in Store Revenue', 25000,
   CURRENT_DATE + INTERVAL '18 days', 'pending', 'receivable', 'none', 0,
   'manual', 'Projected weekend walk-in sales.'),

  -- ── Overdue ──
  ('22222222-2222-2222-2222-222222222210',
   'bbbbbbbb-0000-0000-0000-000000000002', 'outflow',
   'Freight Logistics Pvt Ltd', 22000,
   CURRENT_DATE - INTERVAL '5 days', 'overdue', 'payable', 'medium', 0.015,
   'manual', 'Last shipment logistics invoice — reminder sent.')

ON CONFLICT (id) DO UPDATE SET
  business_id  = EXCLUDED.business_id,
  type         = EXCLUDED.type,
  counterparty = EXCLUDED.counterparty,
  amount       = EXCLUDED.amount,
  due_date     = EXCLUDED.due_date,
  status       = EXCLUDED.status,
  category     = EXCLUDED.category,
  flexibility  = EXCLUDED.flexibility,
  penalty_rate = EXCLUDED.penalty_rate,
  source       = EXCLUDED.source,
  notes        = EXCLUDED.notes;

INSERT INTO public.counterparty_profiles (id, business_id, name, tier, relationship_notes, total_outstanding)
VALUES
  ('21222222-2222-2222-2222-222222222201', 'bbbbbbbb-0000-0000-0000-000000000002',
   'Main Warehouse Rent', 'strategic',
   'Primary warehouse — losing it means shutting down operations.', 90000),
  ('21222222-2222-2222-2222-222222222202', 'bbbbbbbb-0000-0000-0000-000000000002',
   'Wholesale Textiles Co', 'standard',
   'Key supplier but alternatives exist. Usually grants 10-day extensions.', 75000),
  ('21222222-2222-2222-2222-222222222203', 'bbbbbbbb-0000-0000-0000-000000000002',
   'Digital Ads Agency', 'flexible',
   'Performance marketing agency. Campaigns can be paused instantly.', 45000),
  ('21222222-2222-2222-2222-222222222204', 'bbbbbbbb-0000-0000-0000-000000000002',
   'Delivery Partner Fleet', 'standard',
   'Gig riders — can reduce fleet size temporarily if needed.', 25000)
ON CONFLICT (id) DO UPDATE SET
  business_id        = EXCLUDED.business_id,
  name               = EXCLUDED.name,
  tier               = EXCLUDED.tier,
  relationship_notes = EXCLUDED.relationship_notes,
  total_outstanding  = EXCLUDED.total_outstanding;


-- ==========================================================================
-- 🟢 STABLE MODE — Apex Consulting
-- ==========================================================================
-- Cash: ₹5,00,000
-- Pending outflows: ₹1,97,000 over 45 days
-- Pending inflows:  ₹4,10,000 over 45 days
-- No overdue items.
--
-- Comfortable runway — Layer 2 shows days_to_zero = null (never negative),
-- health score ~85-95. Layer 3 recommends Baseline (pay everything).

INSERT INTO public.transactions (id, business_id, type, counterparty, amount, due_date, status, category, flexibility, penalty_rate, source, notes)
VALUES
  ('33333333-3333-3333-3333-333333333301',
   'cccccccc-0000-0000-0000-000000000003', 'outflow',
   'WeWork Office Lease', 70000,
   CURRENT_DATE + INTERVAL '15 days', 'pending', 'payable', 'none', 0.01,
   'manual', 'Co-working desk rental for 4 consultants.'),

  ('33333333-3333-3333-3333-333333333302',
   'cccccccc-0000-0000-0000-000000000003', 'outflow',
   'AWS Cloud Services', 35000,
   CURRENT_DATE + INTERVAL '22 days', 'pending', 'payable', 'high', 0.0,
   'manual', 'Monthly cloud infra. Reserved instances, can downscale.'),

  ('33333333-3333-3333-3333-333333333305',
   'cccccccc-0000-0000-0000-000000000003', 'outflow',
   'Professional Liability Insurance', 42000,
   CURRENT_DATE + INTERVAL '30 days', 'pending', 'payable', 'none', 0.0,
   'manual', 'Annual E&O insurance premium renewal.'),

  ('33333333-3333-3333-3333-333333333306',
   'cccccccc-0000-0000-0000-000000000003', 'outflow',
   'LinkedIn Recruiter License', 18000,
   CURRENT_DATE + INTERVAL '35 days', 'pending', 'payable', 'high', 0.0,
   'manual', 'Recruitment tool annual license. Can cancel anytime.'),

  ('33333333-3333-3333-3333-333333333307',
   'cccccccc-0000-0000-0000-000000000003', 'outflow',
   'Contractor - Data Analyst', 32000,
   CURRENT_DATE + INTERVAL '18 days', 'pending', 'payable', 'medium', 0.0,
   'manual', 'Freelance data analyst monthly retainer.'),

  -- ── Pending inflows ──
  ('33333333-3333-3333-3333-333333333303',
   'cccccccc-0000-0000-0000-000000000003', 'inflow',
   'Enterprise Client - Q2 Milestone', 220000,
   CURRENT_DATE + INTERVAL '10 days', 'pending', 'receivable', 'none', 0,
   'manual', 'Phase 2 delivery milestone for TechCorp engagement.'),

  ('33333333-3333-3333-3333-333333333304',
   'cccccccc-0000-0000-0000-000000000003', 'inflow',
   'Monthly Retainer - FinServ Ltd', 140000,
   CURRENT_DATE + INTERVAL '28 days', 'pending', 'receivable', 'none', 0,
   'manual', 'Standing monthly advisory retainer.'),

  ('33333333-3333-3333-3333-333333333308',
   'cccccccc-0000-0000-0000-000000000003', 'inflow',
   'Workshop Revenue - March Cohort', 50000,
   CURRENT_DATE + INTERVAL '5 days', 'pending', 'receivable', 'none', 0,
   'manual', 'Executive workshop fees — 20 participants confirmed.')

ON CONFLICT (id) DO UPDATE SET
  business_id  = EXCLUDED.business_id,
  type         = EXCLUDED.type,
  counterparty = EXCLUDED.counterparty,
  amount       = EXCLUDED.amount,
  due_date     = EXCLUDED.due_date,
  status       = EXCLUDED.status,
  category     = EXCLUDED.category,
  flexibility  = EXCLUDED.flexibility,
  penalty_rate = EXCLUDED.penalty_rate,
  source       = EXCLUDED.source,
  notes        = EXCLUDED.notes;

INSERT INTO public.counterparty_profiles (id, business_id, name, tier, relationship_notes, total_outstanding)
VALUES
  ('21333333-3333-3333-3333-333333333301', 'cccccccc-0000-0000-0000-000000000003',
   'Enterprise Client - Q2 Milestone', 'strategic',
   'Flagship client — 40% of annual revenue. White-glove service required.', 0),
  ('21333333-3333-3333-3333-333333333302', 'cccccccc-0000-0000-0000-000000000003',
   'Monthly Retainer - FinServ Ltd', 'strategic',
   '2-year advisory contract. Reliable payer, strong relationship.', 0),
  ('21333333-3333-3333-3333-333333333303', 'cccccccc-0000-0000-0000-000000000003',
   'AWS Cloud Services', 'flexible',
   'Pay-as-you-go cloud provider. Auto-debits, can downscale reserved instances.', 35000),
  ('21333333-3333-3333-3333-333333333304', 'cccccccc-0000-0000-0000-000000000003',
   'WeWork Office Lease', 'standard',
   'Month-to-month co-working agreement. 30-day notice to exit.', 70000)
ON CONFLICT (id) DO UPDATE SET
  business_id        = EXCLUDED.business_id,
  name               = EXCLUDED.name,
  tier               = EXCLUDED.tier,
  relationship_notes = EXCLUDED.relationship_notes,
  total_outstanding  = EXCLUDED.total_outstanding;

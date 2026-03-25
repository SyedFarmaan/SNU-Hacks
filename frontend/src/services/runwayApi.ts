export interface TimelineEntry {
  date: string;           // "YYYY-MM-DD"
  balance: number;        // running cash balance after this transaction (INR)
  counterparty: string;
  transaction_type: 'inflow' | 'outflow';
  amount: number;
}

export interface RunwayResponse {
  // Survival
  days_to_zero: number | null;
  min_balance: number;
  liquidity_gap: number;           // abs(min_balance) if negative, else 0
  // Burn rates
  gross_burn_monthly: number;
  net_burn_monthly: number;
  cash_coverage_days: number | null;
  runway_months: number | null;
  // Horizon snapshots
  cash_at_7d: number;
  cash_at_30d: number;
  cash_at_60d: number;
  // Obligation pressure (0–1 fractions)
  overdue_receivables_pct: number;
  overdue_payables_pct: number;
  penalty_payables_pct: number;
  // Risk
  cash_flow_volatility: number;
  counterparty_concentration_risk: number; // 0–1; 1.0 = 100% concentration
  // Summary
  health_score: number;            // 0–100 integer
  total_payables: number;
  total_receivables: number;
  current_cash_balance: number;
  // Chart
  timeline: TimelineEntry[];
}

export interface RunwayRequest {
  business_id: string;
}

export async function fetchRunway(businessId: string): Promise<RunwayResponse> {
  const res = await fetch('http://localhost:8000/api/runway', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ business_id: businessId } satisfies RunwayRequest),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Runway fetch failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<RunwayResponse>;
}

export interface Obligation {
  id: string;
  counterparty: string;
  amount: number;
  due_date: string;
  category: string;
  flexibility: 'none' | 'medium' | 'high';
  penalty_rate: number;
  include?: boolean | null;
}

export interface Scenario {
  name: string;
  actions: string[];
  min_balance: number;
  total_penalties: number;
  pay_list: Obligation[];
  defer_list: Obligation[];
}

export interface DecideResponse {
  available_cash: number;
  scenario_a: Scenario;
  scenario_b: Scenario;
  scenario_c: Scenario;
  recommended_scenario: string;
}

export async function fetchDecision(businessId: string): Promise<DecideResponse> {
  const res = await fetch('http://localhost:8000/api/decide', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ business_id: businessId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Decision fetch failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<DecideResponse>;
}

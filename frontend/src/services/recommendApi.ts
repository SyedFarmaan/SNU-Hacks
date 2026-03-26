import type { Scenario } from './decideApi';

export interface DraftEmail {
  counterparty: string;
  tier: 'strategic' | 'standard' | 'flexible';
  subject: string;
  body: string;
}

export interface RecommendResponse {
  cot_explanation: string;
  draft_emails: DraftEmail[];
  action_checklist: string[];
}

export async function fetchRecommendation(
  businessId: string,
  chosenScenarioName: string,
  scenario: Scenario,
): Promise<RecommendResponse> {
  const res = await fetch('http://localhost:8000/api/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business_id: businessId,
      chosen_scenario_name: chosenScenarioName,
      scenario,
      counterparty_profiles: [],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Recommendation failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<RecommendResponse>;
}

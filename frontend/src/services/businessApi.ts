const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export interface Business {
    id: string;
    name: string;
    owner_email: string;
    current_cash_balance: number;
}

export async function fetchBusinesses(): Promise<Business[]> {
    const res = await fetch(`${API_BASE}/api/businesses`);
    if (!res.ok) throw new Error(`Failed to fetch businesses: ${res.statusText}`);
    return res.json();
}

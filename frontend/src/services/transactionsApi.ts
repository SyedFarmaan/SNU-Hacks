export interface Transaction {
  id: string;
  counterparty: string;
  amount: number;
  due_date: string;
  type: 'inflow' | 'outflow';
  category: string;
  flexibility: string;
  penalty_rate: number;
  status: string;
}

export interface TransactionsListResponse {
  transactions: Transaction[];
  total_payables: number;
  total_receivables: number;
}

export interface CreateTransactionPayload {
  business_id: string;
  counterparty: string;
  amount: number;
  due_date: string;
  type: 'inflow' | 'outflow';
  category: string;
  flexibility?: string;
  penalty_rate?: number;
}

export async function fetchTransactions(businessId: string): Promise<TransactionsListResponse> {
  const res = await fetch('http://localhost:8000/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ business_id: businessId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch transactions (${res.status}): ${text}`);
  }
  return res.json() as Promise<TransactionsListResponse>;
}

export async function createTransaction(payload: CreateTransactionPayload): Promise<Transaction> {
  const res = await fetch('http://localhost:8000/api/transactions/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create transaction (${res.status}): ${text}`);
  }
  return res.json() as Promise<Transaction>;
}

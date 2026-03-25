export interface ParsedTransaction {
  counterparty: string;
  amount: number;
  transaction_date: string; // ISO-8601 YYYY-MM-DD
  transaction_type: 'inflow' | 'outflow';
  raw_description: string;
}

export interface DuplicateFlag {
  transaction_index: number;
  matched_transaction_id: string;
  match_reason: string;
}

export interface IngestResponse {
  document_type: 'bank_statement' | 'invoice' | 'receipt';
  document_id: string | null;
  transactions: ParsedTransaction[];
  duplicate_flags: DuplicateFlag[];
}

export interface ConfirmRequest {
  business_id: string;
  document_type: 'bank_statement' | 'invoice' | 'receipt';
  transactions: ParsedTransaction[];
  document_id: string | null;
}

export interface ConfirmResponse {
  inserted_count: number;
  transaction_ids: string[];
}

export async function uploadDocument(
  file: File,
  businessId: string
): Promise<IngestResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('business_id', businessId);

  const response = await fetch('http://localhost:8000/api/ingest', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Upload failed (${response.status}): ${body}`);
  }

  return response.json() as Promise<IngestResponse>;
}

export async function confirmTransactions(
  payload: ConfirmRequest
): Promise<ConfirmResponse> {
  const res = await fetch('http://localhost:8000/api/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Confirm failed (${res.status}): ${err}`);
  }

  return res.json() as Promise<ConfirmResponse>;
}

export interface ChatIngestRequest {
  message: string;
  business_id: string;
}

/**
 * NLP Chat-to-Ledger ingestion stub.
 * Accepts a natural-language expense string and returns the same IngestResponse
 * schema as uploadDocument, so it feeds identically into the data matrix.
 *
 * Backend contract: POST /api/chat-ingest
 *   body: { message: string, business_id: string }
 *   response: IngestResponse
 */
export async function parseChatMessage(
  message: string,
  businessId: string
): Promise<IngestResponse> {
  const res = await fetch('http://localhost:8000/api/chat-ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, business_id: businessId } satisfies ChatIngestRequest),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`NLP parsing failed (${res.status}): ${err}`);
  }

  return res.json() as Promise<IngestResponse>;
}

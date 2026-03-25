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
  transactions: ParsedTransaction[];
  duplicate_flags: DuplicateFlag[];
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

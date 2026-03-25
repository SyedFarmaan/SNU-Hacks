"""Layer 1 — Document Ingestion Service.

Responsibilities:
  1. Send an uploaded file to Gemini Vision (Flash) with a strict JSON-only prompt.
  2. Parse the response into structured ParsedTransaction objects.
  3. Flag potential duplicates against existing Supabase transactions.

No financial math is performed here; that is Layer 2's responsibility.
"""

import json
import re
from datetime import date as Date, timedelta

from fastapi import UploadFile

from core.gemini_client import get_client, FLASH_MODEL
from core.supabase_client import get_supabase
from models.document_models import (
    DuplicateFlag,
    IngestResponse,
    ParsedTransaction,
)

# Strict system-level instruction — Gemini must not infer data absent from the document
_PARSE_PROMPT = """You are a financial document parser. Extract every financial transaction visible in this document.

Return ONLY a single valid JSON object matching this exact schema — no markdown, no prose, no extra keys:
{
  "document_type": "<bank_statement|invoice|receipt>",
  "transactions": [
    {
      "counterparty": "<string>",
      "amount": <positive float>,
      "date": "<YYYY-MM-DD>",
      "type": "<inflow|outflow>",
      "description": "<string>"
    }
  ]
}

Rules:
- Do NOT infer, estimate, or add any data that is not explicitly present in the document.
- If a field cannot be read, omit the transaction entirely rather than guessing.
- Amounts must always be positive floats; use the "type" field to indicate direction.
- Dates must be in ISO-8601 format (YYYY-MM-DD).
"""

# Duplicate detection window: transactions within ±3 days with same counterparty and amount
_DUPLICATE_WINDOW_DAYS = 3


def _extract_json(raw: str) -> dict:
    """Strip any markdown fencing from Gemini output and parse JSON.

    Args:
        raw: Raw text response from Gemini.

    Returns:
        Parsed dictionary.

    Raises:
        ValueError: If valid JSON cannot be extracted.
    """
    # Remove ```json ... ``` wrappers if present
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Gemini returned non-JSON output: {raw[:200]}") from exc


def _check_duplicates(
    transactions: list[ParsedTransaction], business_id: str
) -> list[DuplicateFlag]:
    """Compare parsed transactions against existing Supabase records.

    Duplicate detection criteria:
      - Same counterparty (case-insensitive)
      - Same amount (exact float match)
      - Due date within ±DUPLICATE_WINDOW_DAYS of the parsed date

    Args:
        transactions: List of transactions freshly parsed from the document.
        business_id: Supabase business UUID to scope the query.

    Returns:
        List of DuplicateFlag objects for any matched transactions.
    """
    supabase = get_supabase()
    flags: list[DuplicateFlag] = []

    for idx, tx in enumerate(transactions):
        window_start = (tx.transaction_date - timedelta(days=_DUPLICATE_WINDOW_DAYS)).isoformat()
        window_end = (tx.transaction_date + timedelta(days=_DUPLICATE_WINDOW_DAYS)).isoformat()

        result = (
            supabase.table("transactions")
            .select("id, counterparty, amount, due_date")
            .eq("business_id", business_id)
            .eq("amount", tx.amount)
            .gte("due_date", window_start)
            .lte("due_date", window_end)
            .execute()
        )

        for row in result.data:
            if row["counterparty"].lower() == tx.counterparty.lower():
                flags.append(
                    DuplicateFlag(
                        transaction_index=idx,
                        matched_transaction_id=row["id"],
                        match_reason=(
                            f"Existing record id={row['id']} has same counterparty "
                            f"'{row['counterparty']}', amount={row['amount']}, "
                            f"date={row['due_date']} (within ±{_DUPLICATE_WINDOW_DAYS} days)"
                        ),
                    )
                )
                break  # One flag per parsed transaction is sufficient

    return flags


async def parse_document(file: UploadFile, business_id: str) -> IngestResponse:
    """Parse an uploaded financial document using Gemini Vision and flag duplicates.

    Args:
        file: The uploaded file (PDF or image) from the multipart request.
        business_id: Supabase UUID of the owning business, used for duplicate lookup.

    Returns:
        IngestResponse containing document_type, structured transactions, and any
        duplicate flags against existing Supabase records.

    Algorithm:
        1. Read raw file bytes.
        2. Build a Gemini content request: system prompt + inline file data.
        3. Call Gemini Flash with JSON-only instructions.
        4. Strip markdown fencing and parse the JSON response.
        5. Validate each transaction against ParsedTransaction Pydantic model.
        6. Query Supabase for potential duplicates using a fuzzy date window.
    """
    client = get_client()
    file_bytes = await file.read()
    mime_type = file.content_type or "application/octet-stream"

    response = client.models.generate_content(
        model=FLASH_MODEL,
        contents=[
            _PARSE_PROMPT,
            {"mime_type": mime_type, "data": file_bytes},
        ],
    )

    raw_json = _extract_json(response.text)

    # Map Gemini's 'date' and 'type' keys to the Pydantic model's renamed fields
    transactions = [
        ParsedTransaction(
            counterparty=tx["counterparty"],
            amount=tx["amount"],
            transaction_date=tx["date"],
            transaction_type=tx["type"],
            raw_description=tx.get("description", ""),
        )
        for tx in raw_json.get("transactions", [])
    ]
    document_type = raw_json.get("document_type", "receipt")

    duplicate_flags = _check_duplicates(transactions, business_id)

    return IngestResponse(
        document_type=document_type,
        transactions=transactions,
        duplicate_flags=duplicate_flags,
    )

"""Layer 1 — Document Ingestion Service.

Responsibilities:
  1. Send an uploaded file to Gemini Vision (Flash) with a strict JSON-only prompt.
  2. Parse the response into structured ParsedTransaction objects.
  3. Flag potential duplicates against existing Supabase transactions.

No financial math is performed here; that is Layer 2's responsibility.
"""

import json
import re
import time
from datetime import date as Date, timedelta

from fastapi import UploadFile

from google.genai import types

from core.gemini_client import get_client, FLASH_MODEL
from core.supabase_client import get_supabase
from models.document_models import (
    DuplicateFlag,
    IngestResponse,
    ParsedTransaction,
)

# Strict system-level instruction — Gemini must not infer data absent from the document
_PARSE_PROMPT = """You are a financial document parser specializing in Indian SME documents.
Extract every financial transaction visible in this document.
Return ONLY a single valid JSON object — no markdown, no prose, no extra keys:
{
  "document_type": "<bank_statement|invoice|receipt>",
  "transactions": [
    {
      "counterparty": "<vendor or customer name>",
      "amount": <positive float — always a number, never a string>,
      "date": "<YYYY-MM-DD>",
      "type": "<inflow|outflow>",
      "description": "<string>"
    }
  ]
}
Indian document rules:
- Amounts written in Indian format (e.g. 1,05,200.00) must be converted to plain floats (105200.0).
- GST line items (CGST, SGST, IGST) must be summed with the base amount into one transaction.
- UPI transaction IDs, NEFT/IMPS/RTGS reference numbers should go in the description field.
- Bank statement credit entries are inflow; debit entries are outflow.
- Invoice amounts are outflow for the buyer; receivable invoices are inflow.
- If a field cannot be read clearly, omit that transaction entirely — do not guess.
- Dates must be ISO-8601 (YYYY-MM-DD). Convert DD/MM/YYYY or DD-MMM-YYYY formats.
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
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Gemini returned non-JSON output: {raw[:200]}") from exc
    # Coerce amount to float — Gemini sometimes returns strings for Indian-formatted numbers
    for tx in data.get("transactions", []):
        if isinstance(tx.get("amount"), str):
            tx["amount"] = float(tx["amount"].replace(",", "").replace("₹", "").strip())
    return data


def _check_duplicates(
    transactions: list[ParsedTransaction], business_id: str
) -> list[DuplicateFlag]:
    """Compare parsed transactions against existing Supabase records using a single batch query.

    Fetches all existing transactions within the date window in one query, then
    matches in Python — avoids N separate Supabase round-trips for an N-row document.

    Args:
        transactions: List of transactions freshly parsed from the document.
        business_id: Supabase business UUID to scope the query.

    Returns:
        List of DuplicateFlag objects for any matched transactions.
    """
    supabase = get_supabase()
    if not transactions:
        return []

    dates = [tx.transaction_date for tx in transactions]
    window_start = (min(dates) - timedelta(days=_DUPLICATE_WINDOW_DAYS)).isoformat()
    window_end = (max(dates) + timedelta(days=_DUPLICATE_WINDOW_DAYS)).isoformat()

    result = (
        supabase.table("transactions")
        .select("id, counterparty, amount, due_date")
        .eq("business_id", business_id)
        .gte("due_date", window_start)
        .lte("due_date", window_end)
        .execute()
    )
    existing = result.data

    flags: list[DuplicateFlag] = []
    for idx, tx in enumerate(transactions):
        for row in existing:
            if (
                row["counterparty"].lower() == tx.counterparty.lower()
                and float(row["amount"]) == tx.amount
            ):
                flags.append(
                    DuplicateFlag(
                        transaction_index=idx,
                        matched_transaction_id=row["id"],
                        match_reason=(
                            f"Matches existing record: '{row['counterparty']}' "
                            f"₹{row['amount']} on {row['due_date']}"
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

    # Retry up to 3 attempts with 1-second delay between failures
    last_error: Exception | None = None
    response = None
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model=FLASH_MODEL,
                contents=[
                    types.Content(
                        role="user",
                        parts=[
                            types.Part.from_text(text=_PARSE_PROMPT),
                            types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
                        ],
                    )
                ],
            )
            break  # Success — exit retry loop
        except Exception as exc:
            last_error = exc
            if attempt < 2:
                time.sleep(1)

    if response is None:
        raise ValueError(f"Gemini parsing failed after 3 attempts: {last_error}")

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

    # Save a record to the documents table so the confirm endpoint can update its status
    supabase = get_supabase()
    doc_insert = (
        supabase.table("documents")
        .insert({
            "business_id": business_id,
            "document_type": document_type,
            "parse_status": "parsed",
            "parsed_json": raw_json,
        })
        .execute()
    )
    document_id = doc_insert.data[0]["id"] if doc_insert.data else None

    return IngestResponse(
        document_type=document_type,
        transactions=transactions,
        duplicate_flags=duplicate_flags,
        document_id=document_id,
    )

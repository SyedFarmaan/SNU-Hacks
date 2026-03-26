"""Layer 1 — Chat-to-Ledger NLP Service.

Accepts a free-text message like "paid 5000 to Zomato for lunch yesterday"
and converts it into the same IngestResponse schema used by the file-upload path.
Gemini Flash is used for NLP extraction; no financial math is done here.
"""

import json
import logging
import re
import time
from datetime import date as Date

from pydantic import ValidationError

from core.gemini_client import get_client, FLASH_MODEL
from models.document_models import IngestResponse, ParsedTransaction

logger = logging.getLogger(__name__)

# Template uses %s-style substitution to avoid conflicts with curly-brace JSON in the schema.
_CHAT_SYSTEM_PROMPT = """You are a financial transaction parser for Indian SMEs.
A user has described one or more financial transactions in plain text.

Convert the description into a JSON object using ONLY the information given.
Return ONLY a single valid JSON object with no markdown, no prose, no extra keys:
{
  "document_type": "receipt",
  "transactions": [
    {
      "counterparty": "<vendor or customer name, or Unknown if not stated>",
      "amount": <positive number — always a number, never a string>,
      "date": "<YYYY-MM-DD>",
      "type": "<inflow or outflow>",
      "category": "<one of: rent, loan_emi, utility, tax, supplier_invoice, contractor, marketing, subscription, misc>",
      "description": "<verbatim user text>"
    }
  ]
}

Rules:
- document_type must always be the string receipt for chat entries.
- Payments, expenses, purchases, fees → type must be outflow.
- Received, income, sale proceeds → type must be inflow.
- category must be inferred from the context of the transaction:
  - rent: rent, lease, property payments.
  - loan_emi: EMI, loan, interest repayments.
  - utility: electricity, water, gas, internet, phone bills.
  - tax: GST, TDS, income tax, government fees.
  - supplier_invoice: raw materials, inventory, supplies, goods from vendors.
  - contractor: freelancer, labour, outsourced work.
  - marketing: ads, promotions, Swiggy/Zomato ads.
  - subscription: SaaS, software, recurring digital services.
  - misc: anything that does not clearly fit above, or inflow transactions.
- Resolve relative dates (yesterday, last Monday) against today's date provided below.
- If no date is mentioned by the user, use today's date as the transaction date.
- If amount is absent from the user message, return an empty transactions array.
- Indian amount formats like 1,05,200 must be converted to plain floats e.g. 105200.0.
- Do not fabricate data; if a field cannot be determined, omit that transaction.
- date must be ISO-8601 format YYYY-MM-DD."""


def _build_prompt(message: str, today: str) -> str:
    """Assemble the full prompt string safely without .format() to avoid KeyError on braces."""
    return _CHAT_SYSTEM_PROMPT + f"\n\nToday's date: {today}\n\nUser message: {message}"


def _extract_json(raw: str) -> dict:
    """Robustly extract a JSON object from Gemini's raw text response.

    Handles three common Gemini output patterns:
    1. Bare JSON object
    2. JSON wrapped in a markdown code fence (```json ... ```)
    3. JSON embedded within surrounding prose

    Raises:
        ValueError: If no valid JSON object can be extracted.
    """
    # Pattern 1: try parsing the whole response as-is after stripping whitespace
    stripped = raw.strip()
    try:
        return _coerce_amounts(json.loads(stripped))
    except json.JSONDecodeError:
        pass

    # Pattern 2: extract content between first { and last }
    match = re.search(r"\{.*\}", stripped, re.DOTALL)
    if match:
        try:
            return _coerce_amounts(json.loads(match.group()))
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Gemini returned no parseable JSON. Raw response (first 400 chars): {raw[:400]}")


def _coerce_amounts(data: dict) -> dict:
    """Ensure all transaction amounts are floats, not strings."""
    for tx in data.get("transactions", []):
        if isinstance(tx.get("amount"), str):
            cleaned = (
                tx["amount"]
                .replace(",", "")
                .replace("₹", "")
                .replace("Rs.", "")
                .replace("rs.", "")
                .replace("INR", "")
                .strip()
            )
            tx["amount"] = float(cleaned)
    return data


def _build_transaction(tx: dict, fallback_description: str) -> ParsedTransaction | None:
    """Attempt to construct a ParsedTransaction from a raw Gemini dict.

    Returns None and logs a warning if validation fails, so one bad transaction
    does not discard valid ones.
    """
    raw_amount = tx.get("amount")
    raw_date = tx.get("date")
    raw_type = tx.get("type", "").lower().strip()

    # Guard: must have a positive numeric amount; fall back to today if date absent
    if not raw_amount:
        logger.warning("Skipping transaction missing amount: %s", tx)
        return None
    if not raw_date:
        raw_date = Date.today().isoformat()
        logger.info("No date in transaction; defaulting to today: %s", raw_date)

    # Normalise type aliases that Gemini occasionally emits
    if raw_type in {"expense", "debit", "payment"}:
        raw_type = "outflow"
    elif raw_type in {"income", "credit", "revenue", "received"}:
        raw_type = "inflow"

    if raw_type not in {"inflow", "outflow"}:
        logger.warning("Skipping transaction with unrecognised type '%s': %s", raw_type, tx)
        return None

    try:
        return ParsedTransaction(
            counterparty=tx.get("counterparty") or "Unknown",
            amount=float(raw_amount),
            transaction_date=raw_date,
            transaction_type=raw_type,
            category=tx.get("category") or "misc",
            raw_description=tx.get("description") or fallback_description,
        )
    except (ValidationError, ValueError, TypeError) as exc:
        logger.warning("Validation failed for transaction %s: %s", tx, exc)
        return None


async def parse_chat_message(message: str, business_id: str) -> IngestResponse:
    """Parse a free-text financial message via Gemini Flash into structured transactions.

    Args:
        message: Natural-language description of a transaction or set of transactions.
        business_id: Supabase business UUID (reserved for future duplicate detection).

    Returns:
        IngestResponse with document_type='receipt', parsed transactions, and empty
        duplicate_flags (duplicate detection is skipped for the low-latency chat path).

    Raises:
        ValueError: If Gemini fails all retries or returns unparseable output.
    """
    client = get_client()
    today = Date.today().isoformat()
    prompt = _build_prompt(message, today)

    last_error: Exception | None = None
    response = None
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model=FLASH_MODEL,
                contents=prompt,
            )
            break
        except Exception as exc:
            last_error = exc
            logger.warning("Gemini attempt %d failed: %s", attempt + 1, exc)
            if attempt < 2:
                time.sleep(1)

    if response is None:
        raise ValueError(f"Gemini NLP extraction failed after 3 attempts: {last_error}")

    logger.debug("Gemini raw response: %s", response.text)

    raw_json = _extract_json(response.text)
    document_type = raw_json.get("document_type", "receipt")

    # Build transactions individually so one bad entry does not discard all others
    transactions: list[ParsedTransaction] = []
    for tx in raw_json.get("transactions", []):
        parsed = _build_transaction(tx, fallback_description=message)
        if parsed is not None:
            transactions.append(parsed)

    logger.info(
        "chat-ingest: extracted %d transaction(s) from message: %r",
        len(transactions),
        message[:80],
    )

    return IngestResponse(
        document_type=document_type,
        transactions=transactions,
        duplicate_flags=[],  # Skipped for the chat path; low-latency requirement
        document_id=None,
    )

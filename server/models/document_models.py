from __future__ import annotations

from datetime import date as Date
from typing import Literal
from pydantic import BaseModel, Field


class ParsedTransaction(BaseModel):
    """A single financial transaction extracted from an uploaded document."""

    counterparty: str = Field(..., description="Vendor or customer name")
    amount: float = Field(..., gt=0, description="Transaction amount in INR")
    transaction_date: Date = Field(..., description="Transaction or due date")
    transaction_type: Literal["inflow", "outflow"]
    category: str = Field(
        default="misc",
        description="Obligation category: rent, loan_emi, utility, tax, supplier_invoice, contractor, marketing, subscription, misc",
    )
    raw_description: str = Field(default="", description="Raw description from source document")


class DocumentUploadRequest(BaseModel):
    """Metadata accompanying a file upload; the file itself arrives as multipart form-data."""

    business_id: str = Field(..., description="UUID of the business that owns this document")


class DuplicateFlag(BaseModel):
    """Indicates that a parsed transaction likely already exists in the database."""

    transaction_index: int = Field(..., description="Index of the flagged transaction in the parsed list")
    matched_transaction_id: str = Field(..., description="Supabase UUID of the existing record")
    match_reason: str = Field(..., description="Human-readable explanation, e.g. same counterparty+amount±3d")


class IngestResponse(BaseModel):
    """Output of Layer 1: structured transactions extracted from the uploaded document."""

    document_type: Literal["bank_statement", "invoice", "receipt"]
    transactions: list[ParsedTransaction]
    duplicate_flags: list[DuplicateFlag] = Field(
        default_factory=list,
        description="Transactions that appear to already exist in Supabase",
    )
    document_id: str | None = Field(
        None, description="UUID of the newly created documents table record"
    )


class ChatIngestRequest(BaseModel):
    """Input to /chat-ingest: a free-text transaction description from the chatbot."""

    message: str = Field(..., description="Natural-language transaction description")
    business_id: str = Field(..., description="UUID of the owning business")


class ConfirmRequest(BaseModel):
    """Input to the /confirm endpoint: a reviewed list of transactions to persist."""

    business_id: str = Field(..., description="UUID of the owning business")
    document_type: Literal["bank_statement", "invoice", "receipt"]
    transactions: list[ParsedTransaction] = Field(
        ..., description="User-reviewed and edited final transaction list"
    )
    document_id: str | None = Field(
        None, description="Optional UUID of the documents table record to mark as confirmed"
    )


class ConfirmResponse(BaseModel):
    """Output of /confirm: count of rows inserted."""

    inserted_count: int
    transaction_ids: list[str]

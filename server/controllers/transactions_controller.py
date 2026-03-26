"""Transactions API — list and create obligations directly."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Literal

from core.supabase_client import get_supabase
from utils.flexibility import auto_infer_flexibility

router = APIRouter()


class TransactionOut(BaseModel):
    id: str
    counterparty: str
    amount: float
    due_date: str
    type: Literal["inflow", "outflow"]
    category: str
    flexibility: str
    penalty_rate: float
    status: str


class TransactionsListResponse(BaseModel):
    transactions: list[TransactionOut]
    total_payables: float
    total_receivables: float


class CreateTransactionRequest(BaseModel):
    business_id: str
    counterparty: str
    amount: float = Field(..., gt=0)
    due_date: str
    type: Literal["inflow", "outflow"]
    category: str = "misc"
    flexibility: str | None = None
    penalty_rate: float = Field(default=0.0, ge=0)


@router.post("/transactions", response_model=TransactionsListResponse)
def list_transactions(body: dict):
    """List all transactions for a business."""
    business_id = body.get("business_id")
    if not business_id:
        raise HTTPException(status_code=400, detail="business_id is required")

    supabase = get_supabase()
    result = (
        supabase.table("transactions")
        .select("id, counterparty, amount, due_date, type, category, flexibility, penalty_rate, status")
        .eq("business_id", business_id)
        .order("due_date", desc=False)
        .execute()
    )

    transactions = []
    total_payables = 0.0
    total_receivables = 0.0

    for row in result.data:
        amount = float(row["amount"])
        if row["type"] == "outflow":
            total_payables += amount
        else:
            total_receivables += amount

        transactions.append(TransactionOut(
            id=row["id"],
            counterparty=row["counterparty"],
            amount=amount,
            due_date=row["due_date"],
            type=row["type"],
            category=row.get("category") or "misc",
            flexibility=row.get("flexibility") or "medium",
            penalty_rate=float(row.get("penalty_rate") or 0),
            status=row.get("status") or "pending",
        ))

    return TransactionsListResponse(
        transactions=transactions,
        total_payables=total_payables,
        total_receivables=total_receivables,
    )


@router.post("/transactions/create", response_model=TransactionOut)
def create_transaction(request: CreateTransactionRequest):
    """Manually add an obligation to the ledger."""
    supabase = get_supabase()

    flexibility = request.flexibility or auto_infer_flexibility(request.category)

    insert_data = {
        "business_id": request.business_id,
        "counterparty": request.counterparty,
        "amount": request.amount,
        "due_date": request.due_date,
        "type": request.type,
        "category": request.category,
        "flexibility": flexibility,
        "penalty_rate": request.penalty_rate,
        "status": "pending",
    }

    result = supabase.table("transactions").insert(insert_data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create transaction")

    row = result.data[0]
    return TransactionOut(
        id=row["id"],
        counterparty=row["counterparty"],
        amount=float(row["amount"]),
        due_date=row["due_date"],
        type=row["type"],
        category=row.get("category") or "misc",
        flexibility=row.get("flexibility") or flexibility,
        penalty_rate=float(row.get("penalty_rate") or 0),
        status=row.get("status") or "pending",
    )

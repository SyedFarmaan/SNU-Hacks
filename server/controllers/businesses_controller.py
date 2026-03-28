"""Businesses API — list all businesses for the selector."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.supabase_client import get_supabase

router = APIRouter()


class BusinessOut(BaseModel):
    id: str
    name: str
    owner_email: str
    current_cash_balance: float


@router.get("/businesses", response_model=list[BusinessOut])
def list_businesses():
    """Return all businesses (used by the business selector screen)."""
    supabase = get_supabase()
    result = (
        supabase.table("businesses")
        .select("id, name, owner_email, current_cash_balance")
        .order("name", desc=False)
        .execute()
    )
    if result.data is None:
        raise HTTPException(status_code=500, detail="Failed to fetch businesses")

    return [
        BusinessOut(
            id=row["id"],
            name=row["name"],
            owner_email=row["owner_email"],
            current_cash_balance=float(row["current_cash_balance"]),
        )
        for row in result.data
    ]

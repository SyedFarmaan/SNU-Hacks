"""Layer 1 — Confirm Service.

Writes user-reviewed transactions from the Document Intelligence flow into
the Supabase `transactions` table. Zero LLM calls — pure database writes.
"""

from models.document_models import ConfirmRequest, ConfirmResponse
from core.supabase_client import get_supabase
from utils.flexibility import auto_infer_flexibility


async def confirm_transactions(request: ConfirmRequest) -> ConfirmResponse:
    """Persist a reviewed list of transactions into Supabase.

    Steps:
      1. Infer category from transaction_type (inflow → receivable, outflow → payable).
      2. Infer default flexibility using auto_infer_flexibility('misc').
      3. Bulk-insert all transactions into the `transactions` table.
      4. If document_id is provided, update its parse_status to 'confirmed'.
      5. Return inserted UUIDs and count.

    Args:
        request: ConfirmRequest containing business_id, document_type,
                 reviewed transactions, and optional document_id.

    Returns:
        ConfirmResponse with inserted_count and list of transaction UUIDs.
    """
    supabase = get_supabase()
    default_flexibility = auto_infer_flexibility("misc")

    rows = []
    for tx in request.transactions:
        category = "receivable" if tx.transaction_type == "inflow" else "payable"
        rows.append({
            "business_id": request.business_id,
            "counterparty": tx.counterparty,
            "amount": tx.amount,
            "due_date": tx.transaction_date.isoformat(),
            "type": tx.transaction_type,
            "notes": tx.raw_description,
            "status": "pending",
            "source": request.document_type,
            "category": category,
            "flexibility": default_flexibility,
        })

    result = supabase.table("transactions").insert(rows).execute()
    inserted_ids = [row["id"] for row in result.data]

    if request.document_id:
        supabase.table("documents").update(
            {"parse_status": "confirmed"}
        ).eq("id", request.document_id).execute()

    return ConfirmResponse(inserted_count=len(inserted_ids), transaction_ids=inserted_ids)

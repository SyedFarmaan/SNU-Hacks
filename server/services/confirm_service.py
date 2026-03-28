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
      4. For bank statements (status=paid): update current_cash_balance on the
         business — inflows increase it, outflows decrease it.
      5. If document_id is provided, update its parse_status to 'confirmed'.
      6. Return inserted UUIDs and count.

    Args:
        request: ConfirmRequest containing business_id, document_type,
                 reviewed transactions, and optional document_id.

    Returns:
        ConfirmResponse with inserted_count and list of transaction UUIDs.
    """
    supabase = get_supabase()
    # Bank statements and receipts (incl. chat entries) are past transactions
    # that should update the real cash balance. Invoices are future obligations.
    is_past_transaction = request.document_type in ("bank_statement", "receipt")

    rows = []
    cash_delta = 0.0  # net change to apply to current_cash_balance

    for tx in request.transactions:
        category = tx.category if tx.category else "misc"
        flexibility = auto_infer_flexibility(category)
        rows.append({
            "business_id": request.business_id,
            "counterparty": tx.counterparty,
            "amount": tx.amount,
            "due_date": tx.transaction_date.isoformat(),
            "type": tx.transaction_type,
            "notes": tx.raw_description,
            "status": "paid" if is_past_transaction else "pending",
            "source": request.document_type,
            "category": category,
            "flexibility": flexibility,
        })

        # Past transactions (bank statements + receipts/chat) → adjust real balance
        if is_past_transaction:
            if tx.transaction_type == "inflow":
                cash_delta += tx.amount
            else:
                cash_delta -= tx.amount

    result = supabase.table("transactions").insert(rows).execute()
    inserted_ids = [row["id"] for row in result.data]

    # Update the business cash balance to reflect confirmed past transactions
    if is_past_transaction and cash_delta != 0.0:
        biz = (
            supabase.table("businesses")
            .select("current_cash_balance")
            .eq("id", request.business_id)
            .single()
            .execute()
        )
        current = float(biz.data["current_cash_balance"])
        supabase.table("businesses").update(
            {"current_cash_balance": round(current + cash_delta, 2)}
        ).eq("id", request.business_id).execute()

    if request.document_id:
        supabase.table("documents").update(
            {"parse_status": "confirmed"}
        ).eq("id", request.document_id).execute()

    return ConfirmResponse(inserted_count=len(inserted_ids), transaction_ids=inserted_ids)

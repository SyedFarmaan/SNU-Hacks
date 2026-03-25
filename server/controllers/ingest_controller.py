from fastapi import APIRouter, Form, UploadFile, File, HTTPException

from models.document_models import ConfirmRequest, ConfirmResponse, IngestResponse
from services.confirm_service import confirm_transactions
from services.ingest_service import parse_document

router = APIRouter()

MAX_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/ingest", response_model=IngestResponse, summary="Parse uploaded financial document")
async def ingest_document(
    business_id: str = Form(..., description="UUID of the business that owns this document"),
    file: UploadFile = File(..., description="PDF or image file to parse"),
) -> IngestResponse:
    """Layer 1: Accept a multipart file upload, send to Gemini Vision, return structured transactions.

    The controller only handles HTTP plumbing. All parsing and duplicate-detection
    logic lives in services/ingest_service.py.
    """
    allowed_types = {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
    }
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{file.content_type}'. Accepted: PDF, JPEG, PNG, WEBP, HEIC.",
        )

    contents = await file.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(413, "File exceeds 10 MB limit.")
    await file.seek(0)  # Reset for downstream reading

    try:
        result = await parse_document(file=file, business_id=business_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return result


@router.post("/confirm", response_model=ConfirmResponse, summary="Persist reviewed transactions")
async def confirm_document(request: ConfirmRequest) -> ConfirmResponse:
    """Write user-reviewed transactions from Layer 1 parsing into the transactions table."""
    try:
        return await confirm_transactions(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

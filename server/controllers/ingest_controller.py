from fastapi import APIRouter, Form, UploadFile, File, HTTPException

from models.document_models import IngestResponse
from services.ingest_service import parse_document

router = APIRouter()


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

    try:
        result = await parse_document(file=file, business_id=business_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return result

from fastapi import APIRouter, HTTPException

from models.runway_models import RunwayRequest, RunwayResponse
from services.runway_service import compute_runway

router = APIRouter()


@router.post("/runway", response_model=RunwayResponse, summary="Compute cash-flow runway")
def get_runway(request: RunwayRequest) -> RunwayResponse:
    """Layer 2: Return days-to-zero, financial health score, timeline, and liquidity gap.

    The controller only handles HTTP plumbing. All math lives in
    services/runway_service.py (zero LLM calls).
    """
    try:
        return compute_runway(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

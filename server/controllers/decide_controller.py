from fastapi import APIRouter, HTTPException

from models.decision_models import DecideRequest, DecideResponse
from services.decide_service import run_decision_engine

router = APIRouter()


@router.post("/decide", response_model=DecideResponse, summary="Generate pay/defer scenarios")
def get_decision(request: DecideRequest) -> DecideResponse:
    """Layer 3: Run the greedy optimization engine and return three pay/defer scenarios.

    The controller only handles HTTP plumbing. All scoring and scenario-building
    logic lives in services/decide_service.py (zero LLM calls).
    """
    try:
        return run_decision_engine(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

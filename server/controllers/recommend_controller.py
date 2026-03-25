from fastapi import APIRouter, HTTPException

from models.recommend_models import RecommendRequest, RecommendResponse
from services.recommend_service import generate_recommendation

router = APIRouter()


@router.post("/recommend", response_model=RecommendResponse, summary="Generate AI recommendation")
def get_recommendation(request: RecommendRequest) -> RecommendResponse:
    """Layer 4: Call Gemini Pro to produce CoT explanation, draft emails, and action checklist.

    The controller only handles HTTP plumbing. All LLM orchestration lives in
    services/recommend_service.py.
    """
    try:
        return generate_recommendation(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

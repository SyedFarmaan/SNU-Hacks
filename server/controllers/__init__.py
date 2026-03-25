from fastapi import APIRouter

from . import test_controller
# Import other controllers here as you build them

router = APIRouter()

router.include_router(test_controller.router, prefix="/test", tags=["test"])

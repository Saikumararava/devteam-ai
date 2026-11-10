from fastapi import APIRouter

from app.schemas.status import ModelStatusResponse
from app.services.ollama import check_ollama_status

router = APIRouter(tags=["model"])


@router.get("/api/model/status", response_model=ModelStatusResponse)
def model_status() -> ModelStatusResponse:
    return check_ollama_status()

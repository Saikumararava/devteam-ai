from fastapi import APIRouter

from app.api.health import router as health_router
from app.api.model import router as model_router
from app.api.projects import router as projects_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(model_router)
api_router.include_router(projects_router)

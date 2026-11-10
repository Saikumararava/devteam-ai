from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    service: str
    environment: str


class ModelStatusResponse(BaseModel):
    connected: bool
    base_url: str
    configured_model: str
    model_available: bool
    available_models: list[str] = Field(default_factory=list)
    error: str | None = None
    inference_notes: str

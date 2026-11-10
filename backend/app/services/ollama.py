import httpx

from app.config import get_settings
from app.schemas.status import ModelStatusResponse

CPU_NOTES = (
    "CPU-only inference is enabled. Agents will run sequentially against a single "
    "local Ollama model to stay within 16 GB RAM."
)


def check_ollama_status() -> ModelStatusResponse:
    settings = get_settings()
    base = settings.ollama_base_url.rstrip("/")
    configured = settings.ollama_model
    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.get(f"{base}/api/tags")
            response.raise_for_status()
            payload = response.json()
        names = [item.get("name", "") for item in payload.get("models", []) if item.get("name")]
        available = configured in names or any(name.startswith(configured) for name in names)
        return ModelStatusResponse(
            connected=True,
            base_url=base,
            configured_model=configured,
            model_available=available,
            available_models=names,
            error=None if available else f"Connected, but {configured} is not pulled yet.",
            inference_notes=CPU_NOTES,
        )
    except Exception as exc:  # noqa: BLE001 — surface connection problems to the UI
        return ModelStatusResponse(
            connected=False,
            base_url=base,
            configured_model=configured,
            model_available=False,
            available_models=[],
            error=str(exc),
            inference_notes=CPU_NOTES,
        )

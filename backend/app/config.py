from functools import lru_cache
from pathlib import Path
import os

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_ROOT.parent

# Default threads to logical CPUs - 2 for snappy UI response, min 4, max 8
DEFAULT_THREADS = max(4, min(8, int(os.environ.get("NUMBER_OF_PROCESSORS", "4")) - 2))


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT / ".env", BACKEND_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "DevTeam AI"
    app_env: str = "development"
    app_host: str = "127.0.0.1"
    app_port: int = 8000

    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "qwen2.5-coder:7b"
    ollama_timeout_seconds: int = 300
    ollama_num_predict: int = 2048
    ollama_num_ctx: int = 4096
    ollama_num_threads: int = DEFAULT_THREADS

    database_url: str = "sqlite:///./data/devteam.db"
    generated_projects_dir: str = str(REPO_ROOT / "generated_projects")
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    docker_enabled: bool = False
    sandbox_image: str = "devteam-ai-sandbox:local"
    sandbox_memory: str = "512m"
    sandbox_cpus: str = "1"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def sqlite_path(self) -> Path:
        if self.database_url.startswith("sqlite:///"):
            relative = self.database_url.replace("sqlite:///", "", 1)
            path = Path(relative)
            if not path.is_absolute():
                return (BACKEND_ROOT / path).resolve()
            return path
        return BACKEND_ROOT / "data" / "devteam.db"

    @property
    def generated_root(self) -> Path:
        path = Path(self.generated_projects_dir)
        if not path.is_absolute():
            return (BACKEND_ROOT / path).resolve()
        return path


@lru_cache
def get_settings() -> Settings:
    return Settings()

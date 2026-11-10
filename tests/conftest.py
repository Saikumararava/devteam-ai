import os
from pathlib import Path
import pytest

os.environ.setdefault("DATABASE_URL", f"sqlite:///{Path('backend/data/test_devteam.db').resolve().as_posix()}")
os.environ.setdefault("OLLAMA_BASE_URL", "http://127.0.0.1:11434")

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    from app.database.session import init_db
    init_db()

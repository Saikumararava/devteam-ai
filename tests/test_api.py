"""
API and Security integration tests for DevTeam AI.
"""
from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.security.paths import validate_relative_path, safe_join, UnsafePathError
from pathlib import Path

client = TestClient(app)


def test_path_traversal_prevention():
    """Verify security controls block directory traversal."""
    with pytest.raises(UnsafePathError):
        validate_relative_path("../../etc/passwd")

    with pytest.raises(UnsafePathError):
        validate_relative_path("C:/Windows/System32/calc.exe")

    with pytest.raises(UnsafePathError):
        validate_relative_path("/root/secrets.txt")

    # Valid relative paths should succeed
    p = validate_relative_path("src/app/main.py")
    assert "main.py" in str(p)


def test_safe_join():
    """Verify safe_join raises on path escape."""
    base = Path("T:/llmproject/generated_projects/1")
    safe = safe_join(base, "models/user.py")
    assert safe == (base / "models/user.py").resolve()

    with pytest.raises(UnsafePathError):
        safe_join(base, "../2/secrets.py")


def test_full_project_lifecycle():
    """Test creating, fetching, reading stats, and file endpoints."""
    # 1. Create project
    res = client.post(
        "/api/projects",
        json={
            "name": "E-Commerce Microservice",
            "description": "Order processing and cart management",
            "tech_preferences": "Python, FastAPI",
            "functional_requirements": "Add items, checkout, calc taxes",
            "expected_output": "FastAPI service with Pytest tests",
        },
    )
    assert res.status_code == 201
    data = res.json()
    project_id = data["id"]
    assert data["name"] == "E-Commerce Microservice"
    assert len(data["agents"]) == 5

    # 2. Status & stats
    stats_res = client.get("/api/projects/stats")
    assert stats_res.status_code == 200
    assert stats_res.json()["total_projects"] >= 1

    # 3. Agent roster endpoint
    agents_res = client.get(f"/api/projects/{project_id}/agents")
    assert agents_res.status_code == 200
    agents = agents_res.json()["agents"]
    assert len(agents) == 5
    agent_names = [a["agent_name"] for a in agents]
    assert "planner" in agent_names
    assert "developer" in agent_names
    assert "reviewer" in agent_names
    assert "tester" in agent_names
    assert "documentation" in agent_names

    # 4. Review endpoint
    review_res = client.get(f"/api/projects/{project_id}/review")
    assert review_res.status_code == 200
    assert "findings" in review_res.json()

    # 5. Tests endpoint
    tests_res = client.get(f"/api/projects/{project_id}/tests")
    assert tests_res.status_code == 200
    assert "results" in tests_res.json()

    # 6. Documentation endpoint
    docs_res = client.get(f"/api/projects/{project_id}/documentation")
    assert docs_res.status_code == 200
    assert "readme" in docs_res.json()

    # 7. Recent activity endpoint
    activity_res = client.get("/api/projects/activity")
    assert activity_res.status_code == 200
    assert isinstance(activity_res.json(), list)

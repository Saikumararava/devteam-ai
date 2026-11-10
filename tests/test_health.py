from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_ok() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "DevTeam AI"


def test_model_status_shape() -> None:
    response = client.get("/api/model/status")
    assert response.status_code == 200
    body = response.json()
    assert "connected" in body
    assert body["configured_model"] == "qwen2.5-coder:1.5b"


def test_create_and_list_project() -> None:
    created = client.post(
        "/api/projects",
        json={
            "name": "Inventory API",
            "description": "Track warehouse stock",
            "tech_preferences": "Python, FastAPI",
            "functional_requirements": "CRUD items and quantities",
            "expected_output": "REST API with tests",
        },
    )
    assert created.status_code == 201
    project = created.json()
    assert project["name"] == "Inventory API"
    assert len(project["agents"]) == 5

    listed = client.get("/api/projects")
    assert listed.status_code == 200
    assert any(item["id"] == project["id"] for item in listed.json())

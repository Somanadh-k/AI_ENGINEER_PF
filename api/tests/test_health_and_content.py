from __future__ import annotations

from fastapi.testclient import TestClient


def test_health_reports_real_state(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()

    assert body["status"] == "operational"
    assert body["database"] == "ok"
    assert body["environment"] == "test"
    assert body["contentItems"] >= 20
    assert body["ai"]["configured"] is False
    assert body["ai"]["mode"] == "fallback"
    assert body["adminConfigured"] is True
    assert body["analytics"]["consentRequired"] is True

    # Security headers are set by the API middleware.
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"


def test_content_is_seeded_from_the_single_source_of_truth(client: TestClient) -> None:
    response = client.get("/api/content")
    assert response.status_code == 200
    body = response.json()

    assert body["profile"]["name"] == "Somanadh K"
    assert body["profile"]["email"] == "skollavajjala@gmail.com"
    assert body["profile"]["links"]["github"] is None
    assert body["meta"]["revision"]
    assert "20" in response.headers["cache-control"]

    slugs = {project["slug"] for project in body["projects"]}
    assert slugs == {"studentos", "qems", "somanadh-os"}
    assert {project["slug"] for project in body["projects"] if project["verified"]} == {
        "somanadh-os"
    }


def test_verified_and_sealed_project_routes(client: TestClient) -> None:
    verified = client.get("/api/content/projects/somanadh-os")
    assert verified.status_code == 200
    assert verified.json()["project"]["verified"] is True

    sealed = client.get("/api/content/projects/studentos")
    assert sealed.status_code == 200
    assert sealed.json()["project"]["verified"] is False
    assert sealed.json()["project"]["stack"] == []

    missing = client.get("/api/content/projects/not-a-project")
    assert missing.status_code == 404

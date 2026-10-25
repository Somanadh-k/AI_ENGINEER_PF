from __future__ import annotations

import sqlite3

from fastapi.testclient import TestClient

from tests.conftest import TEST_DB


def _event(client: TestClient, **overrides) -> dict:
    payload = {
        "visitorId": "visitor-test-0001",
        "sessionId": "session-test-0001",
        "type": "pageview",
        "path": "/?utm_source=test",
        "referrer": "https://www.linkedin.com/feed/",
    }
    payload.update(overrides)
    return payload


def test_consented_analytics_are_recorded_without_raw_ip(client: TestClient) -> None:
    response = client.post(
        "/api/analytics/event",
        json=_event(client),
        headers={
            "user-agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 Chrome/140.0 Safari/537.36"
            ),
            "x-vercel-ip-country": "IN",
            "x-forwarded-for": "203.0.113.77",
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["ok"] is True
    assert response.json()["active"] == 1

    live = client.get("/api/analytics/live")
    assert live.status_code == 200
    assert live.json()["active"] == 1

    heartbeat = client.post(
        "/api/analytics/heartbeat",
        json={
            "visitorId": "visitor-test-0001",
            "sessionId": "session-test-0001",
            "path": "/",
            "engagementDelta": 25,
        },
    )
    assert heartbeat.status_code == 200
    assert heartbeat.json()["ok"] is True

    with sqlite3.connect(TEST_DB) as connection:
        session_row = connection.execute(
            "SELECT visitor_id, pageviews, engagement_seconds, device, browser, country "
            "FROM visitor_sessions"
        ).fetchone()
        event_row = connection.execute(
            "SELECT path, country, referrer_host, source FROM analytics_events"
        ).fetchone()
        dump = "\n".join(
            str(row)
            for table in ("visitor_sessions", "analytics_events")
            for row in connection.execute(f"SELECT * FROM {table}").fetchall()
        )

    assert session_row == ("visitor-test-0001", 1, 25, "desktop", "Chrome", "IN")
    assert event_row == ("/", "IN", "linkedin.com", "linkedin")
    assert "203.0.113.77" not in dump


def test_admin_analytics_reflects_measured_events(client: TestClient) -> None:
    client.post(
        "/api/analytics/event",
        json=_event(client),
        headers={"x-vercel-ip-country": "IN"},
    )
    client.post(
        "/api/analytics/event",
        json=_event(
            client,
            type="project_view",
            path="/projects/somanadh-os",
            projectSlug="somanadh-os",
        ),
    )

    login = client.post("/api/admin/login", json={"password": "test-admin-password"})
    assert login.status_code == 200
    assert "httponly" in login.headers["set-cookie"].lower()

    summary = client.get("/api/admin/analytics?range=7d")
    assert summary.status_code == 200, summary.text
    body = summary.json()
    assert body["totals"]["pageViews"] == 1
    assert body["totals"]["uniqueVisitors"] == 1
    assert body["topPages"][0] == {"label": "/", "value": 1}
    assert body["topProjects"][0] == {"label": "somanadh-os", "value": 1}
    assert body["countries"][0] == {"label": "IN", "value": 2}


def test_contact_form_stores_messages_and_filters_honeypot(client: TestClient) -> None:
    valid = client.post(
        "/api/contact",
        json={
            "name": "Test Recruiter",
            "email": "recruiter@example.com",
            "subject": "Backend role",
            "message": "I would like to discuss an early-career backend role.",
            "sourcePage": "/",
        },
    )
    assert valid.status_code == 200, valid.text
    assert valid.json()["stored"] is True

    spam = client.post(
        "/api/contact",
        json={
            "name": "Spam Bot",
            "email": "bot@example.com",
            "subject": "Cheap traffic",
            "message": "This message should never be stored in the database.",
            "website": "https://spam.example",
        },
    )
    assert spam.status_code == 200
    assert spam.json()["stored"] is False

    invalid = client.post(
        "/api/contact",
        json={
            "name": "A",
            "email": "not-an-email",
            "subject": "x",
            "message": "short",
        },
    )
    assert invalid.status_code == 422

    login = client.post("/api/admin/login", json={"password": "test-admin-password"})
    assert login.status_code == 200
    messages = client.get("/api/admin/messages")
    assert messages.status_code == 200
    rows = messages.json()["messages"]
    assert len(rows) == 1
    assert rows[0]["email"] == "recruiter@example.com"
    assert rows[0]["status"] == "new"

    updated = client.patch(
        f"/api/admin/messages/{rows[0]['id']}", json={"status": "read"}
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "read"

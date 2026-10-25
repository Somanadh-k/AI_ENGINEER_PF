from __future__ import annotations

import os
import shutil
import tempfile
from pathlib import Path

import pytest

# Configure the application before importing it. Pydantic Settings reads
# environment variables ahead of .env, so this keeps the test suite fully
# isolated from the developer's local database and admin password.
TEST_ROOT = Path(tempfile.mkdtemp(prefix="somanadh-api-tests-"))
TEST_DB = TEST_ROOT / "test.db"
TEST_UPLOADS = TEST_ROOT / "uploads"
REPO_ROOT = Path(__file__).resolve().parents[2]

os.environ.update(
    {
        "ENVIRONMENT": "test",
        "DATABASE_URL": f"sqlite+aiosqlite:///{TEST_DB}",
        "CONTENT_PATH": str(REPO_ROOT / "content" / "portfolio.json"),
        "FRONTEND_ORIGIN": "http://testserver",
        "ADMIN_EMAIL": "test@example.com",
        "ADMIN_PASSWORD": "test-admin-password",
        "ADMIN_PASSWORD_HASH": "",
        "SECRET_SALT": "test-only-salt",
        "COOKIE_SECURE": "false",
        "OPENROUTER_API_KEY": "",
        "OPENROUTER_MODEL": "",
        "UPLOAD_DIR": str(TEST_UPLOADS),
        "RESUME_DIR": str(TEST_UPLOADS / "resume"),
    }
)

from fastapi.testclient import TestClient  # noqa: E402

from app import ratelimit  # noqa: E402
from app.main import app  # noqa: E402


def _reset_files() -> None:
    TEST_DB.unlink(missing_ok=True)
    if TEST_UPLOADS.exists():
        shutil.rmtree(TEST_UPLOADS)
    ratelimit._buckets.clear()


@pytest.fixture()
def client():
    _reset_files()
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def admin_client(client: TestClient):
    response = client.post("/api/admin/login", json={"password": "test-admin-password"})
    assert response.status_code == 200, response.text
    return client


@pytest.fixture(scope="session", autouse=True)
def _cleanup_test_root():
    yield
    shutil.rmtree(TEST_ROOT, ignore_errors=True)

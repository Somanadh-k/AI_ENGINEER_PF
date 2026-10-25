from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

API_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = API_DIR.parent


class Settings(BaseSettings):
    """Runtime configuration. Everything is overridable through environment variables."""

    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT / ".env", API_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "SOMANADH.OS API"
    version: str = "1.0.0"
    environment: str = "development"
    debug: bool = False

    # Frontend origin allowed through CORS. The browser normally talks to the
    # Next.js proxy, but direct access stays possible during local development.
    frontend_origin: str = "http://localhost:3000"

    # SQLite by default so the project runs with zero infrastructure.
    # Production: postgresql+psycopg://user:pass@host:5432/db
    database_url: str = "sqlite+aiosqlite:///./data/somanadh.db"

    # Content source of truth. The API seeds its content tables from this file
    # on first boot; after that the database is authoritative.
    content_path: str = str(REPO_ROOT / "content" / "portfolio.json")

    # --- AI provider (OpenRouter) -------------------------------------------
    # Both key and model must be present for live inference. Otherwise the
    # assistant serves deterministic, grounded answers from local knowledge.
    openrouter_api_key: str = ""
    openrouter_model: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_referer: str = "http://localhost:3000"
    openrouter_title: str = "SOMANADH.OS Portfolio"
    ai_timeout_seconds: float = 60.0
    ai_max_output_tokens: int = 650

    # --- Admin --------------------------------------------------------------
    admin_email: str = "skollavajjala@gmail.com"
    admin_password: str = ""  # development convenience only
    admin_password_hash: str = ""  # preferred: bcrypt hash
    admin_session_hours: int = 12
    admin_cookie_name: str = "so_admin"
    cookie_secure: bool = False
    secret_salt: str = "change-me-in-production"

    # --- Analytics ----------------------------------------------------------
    analytics_retention_days: int = 400
    active_window_seconds: int = 60

    # --- Limits -------------------------------------------------------------
    max_upload_mb: int = 6
    max_content_bytes: int = 1_500_000
    contact_rate_limit: int = 5
    chat_rate_limit: int = 20
    event_rate_limit: int = 240

    upload_dir: str = str(API_DIR / "uploads")
    resume_dir: str = str(API_DIR / "uploads" / "resume")

    @property
    def ai_configured(self) -> bool:
        return bool(self.openrouter_api_key.strip() and self.openrouter_model.strip())

    @property
    def admin_configured(self) -> bool:
        return bool(self.admin_password_hash.strip() or self.admin_password.strip())

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in {"production", "prod"}

    @property
    def effective_cookie_secure(self) -> bool:
        return self.cookie_secure or self.is_production


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

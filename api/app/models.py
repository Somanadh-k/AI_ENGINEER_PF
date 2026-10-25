from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
    Index,
    Integer,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base, TimestampMixin, utcnow

JSONType = JSON().with_variant(JSONB, "postgresql")


class ContentItem(Base):
    """Document-store-ish content table.

    One row per entity keeps schema changes cheap while still giving us real
    tables, transactions and constraints. `kind` is the entity family
    (profile, project, experience, skill-category, ...), `key` its identifier.
    """

    __tablename__ = "content_items"

    kind: Mapped[str] = mapped_column(String(48), primary_key=True)
    key: Mapped[str] = mapped_column(String(120), primary_key=True)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    data: Mapped[dict[str, Any]] = mapped_column(JSONType, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, server_default=func.now()
    )


class VisitorSession(Base):
    __tablename__ = "visitor_sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    visitor_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False
    )
    last_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False, index=True
    )
    pageviews: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    engagement_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    device: Mapped[str | None] = mapped_column(String(24))
    browser: Mapped[str | None] = mapped_column(String(32))
    os: Mapped[str | None] = mapped_column(String(32))
    country: Mapped[str | None] = mapped_column(String(2))
    referrer_host: Mapped[str | None] = mapped_column(String(160))
    source: Mapped[str | None] = mapped_column(String(48))
    landing_path: Mapped[str | None] = mapped_column(String(300))

    __table_args__ = (Index("ix_visitor_sessions_visitor_last", "visitor_id", "last_seen"),)


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str | None] = mapped_column(String(64), index=True)
    visitor_id: Mapped[str | None] = mapped_column(String(64), index=True)
    event_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    path: Mapped[str | None] = mapped_column(String(300))
    project_slug: Mapped[str | None] = mapped_column(String(120), index=True)
    country: Mapped[str | None] = mapped_column(String(2))
    device: Mapped[str | None] = mapped_column(String(24))
    browser: Mapped[str | None] = mapped_column(String(32))
    referrer_host: Mapped[str | None] = mapped_column(String(160))
    source: Mapped[str | None] = mapped_column(String(48))
    meta: Mapped[dict[str, Any] | None] = mapped_column(JSONType)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False, index=True
    )


class AIInteraction(Base):
    __tablename__ = "ai_interactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str | None] = mapped_column(String(64), index=True)
    visitor_id: Mapped[str | None] = mapped_column(String(64))
    question: Mapped[str] = mapped_column(String(500), nullable=False)
    question_key: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    intent: Mapped[str | None] = mapped_column(String(32))
    mode: Mapped[str] = mapped_column(String(24), default="fallback")
    model: Mapped[str | None] = mapped_column(String(120))
    ok: Mapped[bool] = mapped_column(Boolean, default=True)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    sources: Mapped[list[Any] | None] = mapped_column(JSONType)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False, index=True
    )


class ContactSubmission(Base, TimestampMixin):
    __tablename__ = "contact_submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(200), nullable=False)
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    source_page: Mapped[str | None] = mapped_column(String(300))
    status: Mapped[str] = mapped_column(String(24), default="new", nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AdminSession(Base):
    __tablename__ = "admin_sessions"

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    last_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False
    )


class AIContentCache(Base):
    __tablename__ = "ai_content_cache"

    key: Mapped[str] = mapped_column(String(200), primary_key=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    mode: Mapped[str] = mapped_column(String(24), default="fallback")
    model: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False
    )

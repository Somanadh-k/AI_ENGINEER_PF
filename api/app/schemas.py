from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

EventType = Literal[
    "pageview",
    "project_view",
    "resume_download",
    "contact_click",
    "ai_open",
    "ai_message",
    "outbound_click",
    "command_used",
]

SessionId = Field(min_length=8, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
VisitorId = Field(min_length=8, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")


class BaseIn(BaseModel):
    model_config = ConfigDict(extra="forbid")


class EventIn(BaseIn):
    visitorId: str = VisitorId
    sessionId: str = SessionId
    type: EventType
    path: str = Field(default="/", max_length=300)
    projectSlug: str | None = Field(default=None, max_length=120)
    referrer: str | None = Field(default=None, max_length=500)
    meta: dict[str, Any] | None = None

    @field_validator("meta")
    @classmethod
    def limit_meta(cls, value: dict[str, Any] | None) -> dict[str, Any] | None:
        if value is None:
            return None
        if len(value) > 12:
            raise ValueError("meta may contain at most 12 keys")
        for key, item in value.items():
            if len(str(key)) > 60 or len(str(item)) > 400:
                raise ValueError("meta entries are too large")
        return value


class HeartbeatIn(BaseIn):
    visitorId: str = VisitorId
    sessionId: str = SessionId
    path: str = Field(default="/", max_length=300)
    engagementDelta: int = Field(default=0, ge=0, le=120)


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=1200)


class ChatIn(BaseIn):
    messages: list[ChatMessage] = Field(min_length=1, max_length=12)
    sessionId: str | None = Field(default=None, max_length=64)
    visitorId: str | None = Field(default=None, max_length=64)

    @field_validator("messages")
    @classmethod
    def total_length(cls, value: list[ChatMessage]) -> list[ChatMessage]:
        if sum(len(m.content) for m in value) > 6000:
            raise ValueError("Conversation is too long. Start a new conversation.")
        if value[-1].role != "user":
            raise ValueError("The last message must be from the visitor")
        return value


class IntroIn(BaseIn):
    audience: Literal["recruiter", "engineer", "founder", "student", "visitor"] = "visitor"


class ContactIn(BaseIn):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    subject: str = Field(min_length=2, max_length=200)
    message: str = Field(min_length=10, max_length=5000)
    website: str = Field(default="", max_length=200)  # honeypot
    sourcePage: str = Field(default="/", max_length=300)


class LoginIn(BaseIn):
    password: str = Field(min_length=1, max_length=200)


class ContentPutIn(BaseIn):
    content: dict[str, Any]
    baseRevision: str | None = Field(default=None, max_length=64)


class MessageStatusIn(BaseIn):
    status: Literal["new", "read", "archived"]


class ProjectQuickCreate(BaseIn):
    """Used by the studio's project composer; merged into the full document."""

    name: str = Field(min_length=2, max_length=120)
    slug: str = Field(min_length=2, max_length=120, pattern=r"^[a-z0-9-_]+$")
    category: str = Field(default="AI Product", max_length=80)

from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .models import ContentItem

log = logging.getLogger("somanadh.content")

TOP_LEVEL_DEFAULTS: dict[str, Any] = {
    "meta": {"schemaVersion": 1, "updatedAt": "", "notice": ""},
    "profile": {"name": "Somanadh K", "email": "", "links": {}, "resume": {}, "portrait": {}},
    "hero": {},
    "audiences": [],
    "skills": [],
    "toolkit": [],
    "experience": [],
    "projects": [],
    "certifications": [],
    "beyond": {},
    "buildLog": [],
    "assistant": {},
    "seo": {},
}

# kind -> list key inside the document
LIST_KINDS = {
    "audience": ("audiences", "id"),
    "skill-category": ("skills", "id"),
    "experience": ("experience", "id"),
    "project": ("projects", "slug"),
    "certification": ("certifications", "id"),
    "build-log": ("buildLog", "id"),
}
SINGLE_KINDS = ("meta", "profile", "hero", "beyond", "assistant", "seo", "toolkit")


class ContentValidationError(ValueError):
    pass


class ContentConflictError(RuntimeError):
    pass


def _load_seed_file() -> dict[str, Any]:
    path = Path(settings.content_path)
    if not path.exists():
        log.warning("content seed not found at %s; serving empty shell", path)
        return json.loads(json.dumps(TOP_LEVEL_DEFAULTS))
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _split(doc: dict[str, Any]) -> list[ContentItem]:
    items: list[ContentItem] = []
    for kind in SINGLE_KINDS:
        if kind in doc:
            items.append(ContentItem(kind=kind, key=kind, position=0, data=doc[kind]))
    for kind, (list_key, id_field) in LIST_KINDS.items():
        for position, entry in enumerate(doc.get(list_key) or []):
            key = str(entry.get(id_field) or entry.get("slug") or entry.get("id") or f"{kind}-{position}")
            items.append(ContentItem(kind=kind, key=key, position=position, data=entry))
    return items


async def seed_content(session: AsyncSession) -> None:
    existing = await session.scalar(select(ContentItem).limit(1))
    if existing:
        return
    doc = _load_seed_file()
    session.add_all(_split(doc))
    await session.commit()
    log.info("Seeded portfolio content from %s", settings.content_path)


async def get_content(session: AsyncSession) -> dict[str, Any]:
    rows = (await session.scalars(select(ContentItem).order_by(ContentItem.position))).all()
    if not rows:
        return _load_seed_file()
    doc: dict[str, Any] = json.loads(json.dumps(TOP_LEVEL_DEFAULTS))
    for row in rows:
        if row.kind in SINGLE_KINDS:
            doc[row.kind] = row.data
        elif row.kind in LIST_KINDS:
            list_key, id_field = LIST_KINDS[row.kind]
            entry = dict(row.data)
            entry.setdefault(id_field, row.key)
            doc.setdefault(list_key, []).append(entry)
    # Preserve canonical ordering for lists.
    for kind, (list_key, _) in LIST_KINDS.items():
        doc[list_key] = [e for e in doc.get(list_key, [])]
    meta = dict(doc.get("meta") or {})
    meta["revision"] = content_revision(doc)
    meta["updatedAt"] = _latest_update(rows) or meta.get("updatedAt")
    doc["meta"] = meta
    return doc


def _latest_update(rows: list[ContentItem]) -> str | None:
    stamps = [row.updated_at for row in rows if row.updated_at]
    if not stamps:
        return None
    latest = max(stamps)
    if latest.tzinfo is None:
        latest = latest.replace(tzinfo=timezone.utc)
    return latest.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def content_revision(doc: dict[str, Any]) -> str:
    payload = {k: v for k, v in doc.items() if k != "meta"}
    return hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()[:20]


async def save_content(
    session: AsyncSession, doc: dict[str, Any], base_revision: str | None = None
) -> dict[str, Any]:
    validate_content(doc)
    current = await get_content(session)
    if base_revision and current["meta"].get("revision") != base_revision:
        raise ContentConflictError(
            "This content changed since you loaded it. Reload the studio before saving."
        )
    await session.execute(delete(ContentItem))
    session.add_all(_split(doc))
    await session.commit()
    return await get_content(session)


# --------------------------------------------------------------------------
# Validation
# --------------------------------------------------------------------------

MAX_STRING = 20_000
MAX_LIST = 200
SAFE_URL_SCHEMES = {"http", "https"}


def _check_url(value: str, *, allow_relative: bool = True) -> bool:
    if allow_relative and value.startswith("/"):
        return " " not in value and "\n" not in value
    parsed = urlparse(value)
    return parsed.scheme in SAFE_URL_SCHEMES and bool(parsed.netloc)


def _walk(value: Any, path: str = "doc") -> None:
    if isinstance(value, str):
        if len(value) > MAX_STRING:
            raise ContentValidationError(f"{path} exceeds {MAX_STRING} characters")
        return
    if isinstance(value, dict):
        for key, item in value.items():
            if not isinstance(key, str) or len(key) > 120:
                raise ContentValidationError(f"Invalid key at {path}")
            _walk(item, f"{path}.{key}")
        return
    if isinstance(value, (list, tuple)):
        if len(value) > MAX_LIST:
            raise ContentValidationError(f"{path} has too many items")
        for index, item in enumerate(value):
            _walk(item, f"{path}[{index}]")
        return
    if isinstance(value, (int, float, bool)) or value is None:
        return
    raise ContentValidationError(f"Unsupported value at {path}")


def validate_content(doc: dict[str, Any]) -> None:
    if not isinstance(doc, dict):
        raise ContentValidationError("Content must be a JSON object")
    size = len(json.dumps(doc))
    if size > settings.max_content_bytes:
        raise ContentValidationError("Content payload too large")

    for required in ("profile", "hero", "skills", "experience", "projects", "seo"):
        if required not in doc:
            raise ContentValidationError(f"Missing required section: {required}")

    profile = doc["profile"]
    if not isinstance(profile, dict) or not profile.get("name"):
        raise ContentValidationError("profile.name is required")
    email = profile.get("email")
    if email and ("@" not in email or " " in email):
        raise ContentValidationError("profile.email is invalid")

    links = profile.get("links") or {}
    if isinstance(links, dict):
        for label, url in links.items():
            if url is None:
                continue
            if not isinstance(url, str) or not _check_url(url):
                raise ContentValidationError(f"Unsafe or invalid link: {label}")

    for project in doc.get("projects") or []:
        if not isinstance(project, dict) or not project.get("slug") or not project.get("name"):
            raise ContentValidationError("Each project needs a slug and a name")
        if not all(c.isalnum() or c in "-_" for c in str(project["slug"])):
            raise ContentValidationError("Project slugs may only contain letters, numbers, - and _")
        for field in ("github", "live", "video"):
            value = project.get(field)
            if value and (not isinstance(value, str) or not _check_url(value)):
                raise ContentValidationError(f"Invalid {field} URL on project {project['slug']}")
        for shot in project.get("screenshots") or []:
            src = shot.get("src") if isinstance(shot, dict) else shot
            if not isinstance(src, str) or not _check_url(src):
                raise ContentValidationError("Invalid screenshot URL")

    for experience in doc.get("experience") or []:
        if not isinstance(experience, dict) or not experience.get("org") or not experience.get("role"):
            raise ContentValidationError("Each experience entry needs an org and a role")

    for category in doc.get("skills") or []:
        if not isinstance(category, dict) or not category.get("id") or not isinstance(
            category.get("skills", []), list
        ):
            raise ContentValidationError("Skill categories need an id and a skills list")

    for entry in doc.get("buildLog") or []:
        if not isinstance(entry, dict) or not entry.get("title"):
            raise ContentValidationError("Build log entries need a title")

    _walk(doc)


def content_markdown_digest(doc: dict[str, Any]) -> str:
    """Compact, human-readable dump used by the AI knowledge base."""
    lines: list[str] = []
    profile = doc.get("profile", {})
    lines.append(f"Name: {profile.get('name')}")
    lines.append(f"Status: {profile.get('status')} / {profile.get('statusDetail')}")
    lines.append(f"Intro: {profile.get('intro')}")
    return "\n".join(lines)

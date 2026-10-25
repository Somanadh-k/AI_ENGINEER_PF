from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, Response, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..analytics import analytics_summary, active_visitors
from ..auth import (
    clear_admin_cookie,
    create_admin_session,
    destroy_admin_session,
    require_admin,
    set_admin_cookie,
    verify_password,
)
from ..config import settings
from ..content import (
    ContentConflictError,
    ContentValidationError,
    get_content,
    save_content,
)
from ..db import SessionLocal, get_db, iso_utc
from ..models import AdminSession, ContactSubmission, utcnow
from ..ratelimit import enforce_rate_limit
from ..schemas import ContentPutIn, LoginIn, MessageStatusIn

router = APIRouter(prefix="/admin", tags=["admin"])

ALLOWED_IMAGES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".avif": "image/avif",
}


def _sniff_image(ext: str, data: bytes) -> bool:
    if ext in {".jpg", ".jpeg"}:
        return data.startswith(b"\xff\xd8\xff")
    if ext == ".png":
        return data.startswith(b"\x89PNG\r\n\x1a\n")
    if ext == ".webp":
        return len(data) > 12 and data[0:4] == b"RIFF" and data[8:12] == b"WEBP"
    if ext == ".avif":
        return len(data) > 12 and data[4:12] in {b"ftypavif", b"ftypavis"}
    return False


async def _read_limited(upload: UploadFile, max_bytes: int) -> bytes:
    data = await upload.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {settings.max_upload_mb} MB limit.",
        )
    return data


@router.post("/login")
async def login(
    payload: LoginIn,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> dict:
    await enforce_rate_limit(request, scope="admin-login", limit=6, window_seconds=900)
    if not settings.admin_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin access is not configured. Set ADMIN_PASSWORD or ADMIN_PASSWORD_HASH on the API.",
        )
    if not verify_password(payload.password):
        # Constant-ish delay to blunt online guessing.
        await asyncio.sleep(0.35)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")

    token, expires = await create_admin_session(db)
    set_admin_cookie(response, token, expires)
    return {"ok": True, "email": settings.admin_email, "expiresAt": expires.isoformat()}


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> dict:
    await destroy_admin_session(request, db)
    clear_admin_cookie(response)
    return {"ok": True}


@router.get("/me")
async def me(session: AdminSession = Depends(require_admin)) -> dict:
    return {
        "authenticated": True,
        "email": settings.admin_email,
        "expiresAt": session.expires_at.isoformat(),
    }


@router.get("/content")
async def admin_content(
    db: AsyncSession = Depends(get_db),
    _: AdminSession = Depends(require_admin),
) -> dict:
    return await get_content(db)


@router.put("/content")
async def admin_update_content(
    payload: ContentPutIn,
    db: AsyncSession = Depends(get_db),
    _: AdminSession = Depends(require_admin),
) -> dict:
    try:
        doc = await save_content(db, payload.content, payload.baseRevision)
    except ContentConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except ContentValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)) from exc
    return {"ok": True, "content": doc}


@router.get("/analytics")
async def admin_analytics(
    range_key: Literal["24h", "7d", "30d", "90d", "all"] = Query("7d", alias="range"),
    db: AsyncSession = Depends(get_db),
    _: AdminSession = Depends(require_admin),
) -> dict:
    return await analytics_summary(db, range_key)


@router.get("/messages")
async def admin_messages(
    db: AsyncSession = Depends(get_db),
    _: AdminSession = Depends(require_admin),
) -> dict:
    rows = (
        await db.scalars(
            select(ContactSubmission).order_by(ContactSubmission.created_at.desc()).limit(200)
        )
    ).all()
    return {
        "messages": [
            {
                "id": row.id,
                "name": row.name,
                "email": row.email,
                "subject": row.subject,
                "message": row.message,
                "status": row.status,
                "sourcePage": row.source_page,
                "createdAt": iso_utc(row.created_at),
            }
            for row in rows
        ]
    }


@router.patch("/messages/{message_id}")
async def update_message(
    message_id: int,
    payload: MessageStatusIn,
    db: AsyncSession = Depends(get_db),
    _: AdminSession = Depends(require_admin),
) -> dict:
    row = await db.get(ContactSubmission, message_id)
    if not row:
        raise HTTPException(status_code=404, detail="Message not found")
    row.status = payload.status
    row.read_at = utcnow() if payload.status == "read" else None
    await db.commit()
    return {"ok": True, "status": row.status}


@router.post("/upload")
async def upload(
    kind: Literal["portrait", "resume", "project"] = Query(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: AdminSession = Depends(require_admin),
) -> dict:
    max_bytes = settings.max_upload_mb * 1024 * 1024
    suffix = Path(file.filename or "").suffix.lower()
    data = await _read_limited(file, max_bytes)
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")

    if kind == "resume":
        if suffix != ".pdf" or not data.startswith(b"%PDF-"):
            raise HTTPException(status_code=415, detail="Résumé must be a PDF.")
        subdir = Path(settings.upload_dir) / "resume"
        ext = ".pdf"
        media_dir = "resume"
    else:
        if suffix not in ALLOWED_IMAGES or not _sniff_image(suffix, data):
            raise HTTPException(
                status_code=415,
                detail="Only JPEG, PNG, WebP, or AVIF images are accepted.",
            )
        subdir = Path(settings.upload_dir) / ("portrait" if kind == "portrait" else "projects")
        ext = ".jpg" if suffix in {".jpg", ".jpeg"} else suffix
        media_dir = "portrait" if kind == "portrait" else "projects"

    subdir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex[:20]}{ext}"
    target = subdir / filename
    target.write_bytes(data)
    url = f"/media/{media_dir}/{filename}"

    doc = await get_content(db)
    if kind == "portrait":
        doc.setdefault("profile", {}).setdefault("portrait", {})["src"] = url
        doc["profile"]["portrait"]["uploadedAt"] = datetime.now(timezone.utc).isoformat()
        await save_content(db, doc)
    elif kind == "resume":
        previous = (doc.get("profile", {}).get("resume") or {}).get("path")
        doc.setdefault("profile", {}).setdefault("resume", {})["path"] = url
        doc["profile"]["resume"]["lastUpdated"] = datetime.now(timezone.utc).date().isoformat()
        doc["profile"]["resume"]["generated"] = False
        await save_content(db, doc)
        if previous and previous.startswith("/media/resume/"):
            old = Path(settings.upload_dir) / "resume" / Path(previous).name
            if old.exists() and old.resolve().is_relative_to(Path(settings.upload_dir).resolve()):
                old.unlink(missing_ok=True)

    return {"ok": True, "url": url, "kind": kind, "bytes": len(data)}


@router.get("/stream")
async def admin_stream(
    request: Request,
    _: AdminSession = Depends(require_admin),
) -> StreamingResponse:
    async def events():
        while True:
            if await request.is_disconnected():
                break
            async with SessionLocal() as own:
                active = await active_visitors(own)
                recent = await analytics_summary(own, "24h")
            payload = {
                "active": active,
                "windowSeconds": settings.active_window_seconds,
                "pageViews24h": recent["totals"]["pageViews"],
                "aiMessages24h": recent["totals"]["aiMessages"],
                "at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            }
            yield f"event: pulse\ndata: {json.dumps(payload)}\n\n"
            await asyncio.sleep(5)

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"},
    )


@router.get("/export")
async def export_content(
    db: AsyncSession = Depends(get_db),
    _: AdminSession = Depends(require_admin),
) -> Response:
    doc = await get_content(db)
    payload = json.dumps(doc, indent=2, ensure_ascii=False)
    return Response(
        content=payload,
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="portfolio-export.json"'},
    )

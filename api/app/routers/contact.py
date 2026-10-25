from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..db import get_db
from ..models import ContactSubmission
from ..ratelimit import enforce_rate_limit
from ..schemas import ContactIn

router = APIRouter(tags=["contact"])


@router.post("/contact")
async def submit_contact(
    payload: ContactIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    await enforce_rate_limit(
        request, scope="contact", limit=settings.contact_rate_limit, window_seconds=3600
    )

    # Honeypot: real visitors never fill this hidden field. Respond normally so
    # bots do not learn they were filtered, but do not persist anything.
    if payload.website.strip():
        return {"ok": True, "stored": False, "delivery": "filtered"}

    submission = ContactSubmission(
        name=payload.name.strip(),
        email=str(payload.email).strip(),
        subject=payload.subject.strip(),
        message=payload.message.strip(),
        source_page=payload.sourcePage,
    )
    db.add(submission)
    try:
        await db.commit()
    except Exception as exc:  # pragma: no cover
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The message could not be stored. Please email directly instead.",
        ) from exc

    return {
        "ok": True,
        "stored": True,
        "delivery": "stored",
        "id": submission.id,
        "note": "Stored securely and visible in the private inbox. No email notification provider is configured.",
    }

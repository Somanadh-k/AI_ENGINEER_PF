from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from ..analytics import active_visitors, clean_path, upsert_session
from ..config import settings
from ..db import get_db
from ..models import AnalyticsEvent
from ..ratelimit import enforce_rate_limit
from ..schemas import EventIn, HeartbeatIn

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.post("/event")
async def ingest_event(
    payload: EventIn,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> dict:
    await enforce_rate_limit(request, scope="event", limit=settings.event_rate_limit, window_seconds=60)
    response.headers["Cache-Control"] = "no-store"

    session = await upsert_session(
        db,
        session_id=payload.sessionId,
        visitor_id=payload.visitorId,
        request=request,
        path=payload.path,
        count_pageview=payload.type == "pageview",
        referrer=payload.referrer,
    )
    event = AnalyticsEvent(
        session_id=payload.sessionId,
        visitor_id=payload.visitorId,
        event_type=payload.type,
        path=clean_path(payload.path),
        project_slug=payload.projectSlug[:120] if payload.projectSlug else None,
        country=session.country,
        device=session.device,
        browser=session.browser,
        referrer_host=session.referrer_host,
        source=session.source,
        meta=payload.meta,
    )
    db.add(event)
    await db.commit()

    active = await active_visitors(db)
    return {"ok": True, "active": active}


@router.post("/heartbeat")
async def heartbeat(
    payload: HeartbeatIn,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> dict:
    await enforce_rate_limit(request, scope="heartbeat", limit=60, window_seconds=60)
    response.headers["Cache-Control"] = "no-store"
    await upsert_session(
        db,
        session_id=payload.sessionId,
        visitor_id=payload.visitorId,
        request=request,
        path=payload.path,
        engagement_delta=payload.engagementDelta,
        count_pageview=False,
    )
    await db.commit()
    active = await active_visitors(db)
    return {
        "ok": True,
        "active": active,
        "windowSeconds": settings.active_window_seconds,
    }


@router.get("/live")
async def live(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> dict:
    await enforce_rate_limit(request, scope="live", limit=120, window_seconds=60)
    response.headers["Cache-Control"] = "no-store"
    return {
        "active": await active_visitors(db),
        "windowSeconds": settings.active_window_seconds,
        "measuredAt": datetime.now(timezone.utc).isoformat(),
    }

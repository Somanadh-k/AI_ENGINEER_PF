from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..ai import ai_status
from ..config import settings
from ..db import get_db
from ..models import AnalyticsEvent

router = APIRouter(tags=["system"])


@router.get("/health")
async def health(db: AsyncSession = Depends(get_db)) -> dict:
    db_status = "ok"
    content_items = 0
    events = 0
    try:
        await db.execute(text("SELECT 1"))
        content_items = int(
            await db.scalar(text("SELECT COUNT(*) FROM content_items")) or 0
        )
        events = int(await db.scalar(select(func.count(AnalyticsEvent.id))) or 0)
    except Exception:  # pragma: no cover - surfaced as degraded health
        db_status = "unavailable"

    return {
        "status": "operational" if db_status == "ok" else "degraded",
        "version": settings.version,
        "environment": settings.environment,
        "time": datetime.now(timezone.utc).isoformat(),
        "database": db_status,
        "contentItems": content_items,
        "analyticsEvents": events,
        "ai": ai_status(),
        "analytics": {
            "activeWindowSeconds": settings.active_window_seconds,
            "retentionDays": settings.analytics_retention_days,
            "consentRequired": True,
        },
        "adminConfigured": settings.admin_configured,
    }

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlparse

from fastapi import Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .models import AIInteraction, AnalyticsEvent, ContactSubmission, VisitorSession, utcnow

# --- Request enrichment (no IP storage) -----------------------------------

_TRACKING_PARAMS = re.compile(r"^(utm_|ref|fbclid|gclid|mc_)", re.IGNORECASE)


def country_from_headers(request: Request) -> str | None:
    for header in ("x-vercel-ip-country", "cf-ipcountry", "x-country-code"):
        value = request.headers.get(header)
        if value and len(value) == 2 and value.isalpha():
            return value.upper()
    return None


def device_from_ua(ua: str) -> tuple[str, str, str]:
    """Return (device, browser, os) using conservative string matching."""
    ua_l = ua.lower()
    if "iphone" in ua_l or "android" in ua_l and "mobile" in ua_l:
        device = "mobile"
    elif "ipad" in ua_l or "tablet" in ua_l:
        device = "tablet"
    elif "mobile" in ua_l:
        device = "mobile"
    else:
        device = "desktop"

    if "edg/" in ua_l:
        browser = "Edge"
    elif "opr/" in ua_l or "opera" in ua_l:
        browser = "Opera"
    elif "chrome/" in ua_l or "crios" in ua_l:
        browser = "Chrome"
    elif "firefox/" in ua_l or "fxios" in ua_l:
        browser = "Firefox"
    elif "safari/" in ua_l:
        browser = "Safari"
    else:
        browser = "Other"

    if "iphone" in ua_l or "ipad" in ua_l or "ios" in ua_l:
        os_name = "iOS"
    elif "android" in ua_l:
        os_name = "Android"
    elif "mac os x" in ua_l or "macintosh" in ua_l:
        os_name = "macOS"
    elif "windows" in ua_l:
        os_name = "Windows"
    elif "linux" in ua_l:
        os_name = "Linux"
    else:
        os_name = "Other"
    return device, browser, os_name


def referrer_info(referrer: str | None) -> tuple[str | None, str]:
    if not referrer:
        return None, "direct"
    try:
        host = urlparse(referrer).netloc.lower().removeprefix("www.")
    except ValueError:
        return None, "direct"
    if not host:
        return None, "direct"
    if "linkedin" in host:
        source = "linkedin"
    elif "google" in host:
        source = "search"
    elif "github" in host:
        source = "github"
    elif "x.com" in host or "twitter" in host:
        source = "social"
    elif "localhost" in host or host.endswith(settings.frontend_origin.split("//")[-1]):
        source = "direct"
    else:
        source = "referral"
    return host[:160], source


def clean_path(path: str | None) -> str:
    if not path:
        return "/"
    base = path.split("?")[0][:300]
    return base if base.startswith("/") else "/"


async def upsert_session(
    db: AsyncSession,
    *,
    session_id: str,
    visitor_id: str,
    request: Request,
    path: str,
    engagement_delta: int = 0,
    count_pageview: bool = False,
    referrer: str | None = None,
) -> VisitorSession:
    session = await db.get(VisitorSession, session_id)
    ua = request.headers.get("user-agent", "")
    device, browser, os_name = device_from_ua(ua)
    referrer_host, source = referrer_info(referrer or request.headers.get("referer"))
    country = country_from_headers(request)

    if session is None:
        session = VisitorSession(
            id=session_id,
            visitor_id=visitor_id,
            started_at=utcnow(),
            last_seen=utcnow(),
            pageviews=1 if count_pageview else 0,
            engagement_seconds=min(engagement_delta, 120),
            device=device,
            browser=browser,
            os=os_name,
            country=country,
            referrer_host=referrer_host,
            source=source,
            landing_path=clean_path(path),
        )
        db.add(session)
    else:
        session.last_seen = utcnow()
        session.visitor_id = visitor_id
        if count_pageview:
            session.pageviews += 1
        if engagement_delta:
            session.engagement_seconds += min(engagement_delta, 120)
        if country and not session.country:
            session.country = country
    return session


async def active_visitors(db: AsyncSession) -> int:
    cutoff = utcnow() - timedelta(seconds=settings.active_window_seconds)
    stmt = select(func.count(func.distinct(VisitorSession.visitor_id))).where(
        VisitorSession.last_seen >= cutoff
    )
    return int(await db.scalar(stmt) or 0)


def _range_start(range_key: str) -> datetime:
    now = utcnow()
    mapping = {
        "24h": timedelta(hours=24),
        "7d": timedelta(days=7),
        "30d": timedelta(days=30),
        "90d": timedelta(days=90),
        "all": timedelta(days=3650),
    }
    return now - mapping.get(range_key, timedelta(days=7))


def _as_date(value: Any) -> str:
    if isinstance(value, datetime):
        return value.date().isoformat()
    return str(value)[:10]


async def analytics_summary(db: AsyncSession, range_key: str = "7d") -> dict[str, Any]:
    start = _range_start(range_key)
    now = utcnow()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week = today - timedelta(days=today.weekday())
    month = today.replace(day=1)

    async def count_sessions(since: datetime) -> int:
        return int(
            await db.scalar(
                select(func.count(func.distinct(VisitorSession.visitor_id))).where(
                    VisitorSession.started_at >= since
                )
            )
            or 0
        )

    totals = {
        "pageViews": int(
            await db.scalar(
                select(func.count(AnalyticsEvent.id)).where(
                    AnalyticsEvent.event_type == "pageview",
                    AnalyticsEvent.created_at >= start,
                )
            )
            or 0
        ),
        "uniqueVisitors": await count_sessions(start),
        "activeVisitors": await active_visitors(db),
        "visitsToday": await count_sessions(today),
        "visitsThisWeek": await count_sessions(week),
        "visitsThisMonth": await count_sessions(month),
        "resumeDownloads": int(
            await db.scalar(
                select(func.count(AnalyticsEvent.id)).where(
                    AnalyticsEvent.event_type == "resume_download",
                    AnalyticsEvent.created_at >= start,
                )
            )
            or 0
        ),
        "contactClicks": int(
            await db.scalar(
                select(func.count(AnalyticsEvent.id)).where(
                    AnalyticsEvent.event_type == "contact_click",
                    AnalyticsEvent.created_at >= start,
                )
            )
            or 0
        ),
        "aiMessages": int(
            await db.scalar(
                select(func.count(AIInteraction.id)).where(AIInteraction.created_at >= start)
            )
            or 0
        ),
        "contactSubmissions": int(
            await db.scalar(
                select(func.count(ContactSubmission.id)).where(
                    ContactSubmission.created_at >= start
                )
            )
            or 0
        ),
    }

    avg_engagement = await db.scalar(
        select(func.avg(VisitorSession.engagement_seconds)).where(
            VisitorSession.started_at >= start, VisitorSession.engagement_seconds > 0
        )
    )

    async def grouped(column, *, since: datetime, limit: int = 8, event_type: str | None = None):
        stmt = select(column, func.count(AnalyticsEvent.id)).where(
            AnalyticsEvent.created_at >= since, column.is_not(None)
        )
        if event_type:
            stmt = stmt.where(AnalyticsEvent.event_type == event_type)
        stmt = stmt.group_by(column).order_by(func.count(AnalyticsEvent.id).desc()).limit(limit)
        rows = (await db.execute(stmt)).all()
        return [{"label": row[0], "value": int(row[1])} for row in rows]

    series_stmt = (
        select(func.date(AnalyticsEvent.created_at), func.count(AnalyticsEvent.id))
        .where(AnalyticsEvent.created_at >= start, AnalyticsEvent.event_type == "pageview")
        .group_by(func.date(AnalyticsEvent.created_at))
        .order_by(func.date(AnalyticsEvent.created_at))
    )
    series_rows = (await db.execute(series_stmt)).all()
    traffic_series = [{"date": _as_date(row[0]), "views": int(row[1])} for row in series_rows]

    session_series_stmt = (
        select(func.date(VisitorSession.started_at), func.count(func.distinct(VisitorSession.visitor_id)))
        .where(VisitorSession.started_at >= start)
        .group_by(func.date(VisitorSession.started_at))
        .order_by(func.date(VisitorSession.started_at))
    )
    session_rows = (await db.execute(session_series_stmt)).all()
    visitors_by_day = {_as_date(row[0]): int(row[1]) for row in session_rows}
    for point in traffic_series:
        point["visitors"] = visitors_by_day.get(point["date"], 0)

    top_questions_stmt = (
        select(AIInteraction.question, func.count(AIInteraction.id))
        .where(AIInteraction.created_at >= start)
        .group_by(AIInteraction.question)
        .order_by(func.count(AIInteraction.id).desc())
        .limit(8)
    )
    top_questions = [
        {"question": row[0], "count": int(row[1])}
        for row in (await db.execute(top_questions_stmt)).all()
    ]

    sources = await grouped(AnalyticsEvent.source, since=start)
    referrers = await grouped(AnalyticsEvent.referrer_host, since=start)
    devices = await grouped(AnalyticsEvent.device, since=start)
    browsers = await grouped(AnalyticsEvent.browser, since=start)
    countries = await grouped(AnalyticsEvent.country, since=start)
    pages = await grouped(AnalyticsEvent.path, since=start, event_type="pageview", limit=10)
    projects = await grouped(
        AnalyticsEvent.project_slug, since=start, event_type="project_view", limit=10
    )

    recent_stmt = select(AnalyticsEvent).order_by(AnalyticsEvent.created_at.desc()).limit(12)
    recent_events = (await db.scalars(recent_stmt)).all()

    return {
        "range": range_key,
        "generatedAt": now.isoformat(),
        "totals": {**totals, "avgEngagementSeconds": round(float(avg_engagement or 0), 1)},
        "trafficSeries": traffic_series,
        "topPages": pages,
        "topProjects": projects,
        "sources": sources,
        "referrers": referrers,
        "devices": devices,
        "browsers": browsers,
        "countries": countries,
        "topQuestions": top_questions,
        "recentEvents": [
            {
                "type": event.event_type,
                "path": event.path,
                "project": event.project_slug,
                "country": event.country,
                "device": event.device,
                "createdAt": event.created_at.isoformat() if event.created_at else None,
            }
            for event in recent_events
        ],
    }

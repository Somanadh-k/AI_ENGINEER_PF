from __future__ import annotations

import json
import time
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ..ai import ai_status, generate_intro, stream_answer
from ..config import settings
from ..content import get_content
from ..db import get_db
from ..ratelimit import enforce_rate_limit
from ..schemas import ChatIn, IntroIn

router = APIRouter(prefix="/ai", tags=["ai"])


def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.get("/status")
async def status() -> dict:
    return ai_status()


@router.post("/chat")
async def chat(
    payload: ChatIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    await enforce_rate_limit(request, scope="chat", limit=settings.chat_rate_limit, window_seconds=60)
    doc = await get_content(db)
    messages = [m.model_dump() for m in payload.messages]

    async def generator() -> AsyncIterator[str]:
        try:
            async for event in stream_answer(
                doc, messages, payload.sessionId, payload.visitorId
            ):
                yield sse(event["event"], event["data"])
        except Exception:
            yield sse("error", {"message": "Unexpected streaming failure", "recovered": False})
        yield "event: end\ndata: {}\n\n"

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.post("/intro")
async def intro(
    payload: IntroIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    await enforce_rate_limit(request, scope="intro", limit=12, window_seconds=300)
    doc = await get_content(db)
    result = await generate_intro(doc, payload.audience)
    result["generatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    return result

from __future__ import annotations

import asyncio
import hashlib
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status

from .config import settings

# In-process sliding-window limiter. Correct for a single instance, which is
# what this portfolio runs on. If you scale to multiple API instances, move the
# buckets to Redis (documented in README) — do not remove the limits.
_buckets: dict[str, deque[float]] = defaultdict(deque)
_lock = asyncio.Lock()
_last_sweep = 0.0


def request_fingerprint(request: Request) -> str:
    """Stable, non-reversible identifier for rate limiting.

    Raw IP addresses are never logged or persisted.
    """
    forwarded = request.headers.get("x-forwarded-for", "")
    host = forwarded.split(",")[0].strip() if forwarded else ""
    if not host and request.client:
        host = request.client.host
    digest = hashlib.sha256(f"{settings.secret_salt}:{host}".encode()).hexdigest()
    return digest[:32]


async def enforce_rate_limit(
    request: Request, *, scope: str, limit: int, window_seconds: int = 60
) -> None:
    global _last_sweep
    key = f"{scope}:{request_fingerprint(request)}"
    now = time.monotonic()
    async with _lock:
        bucket = _buckets[key]
        while bucket and now - bucket[0] > window_seconds:
            bucket.popleft()
        if len(bucket) >= limit:
            retry = max(1, int(window_seconds - (now - bucket[0])))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please slow down and try again shortly.",
                headers={"Retry-After": str(retry)},
            )
        bucket.append(now)
        if now - _last_sweep > 600:
            _last_sweep = now
            for bucket_key in [k for k, v in _buckets.items() if not v or now - v[-1] > 900]:
                _buckets.pop(bucket_key, None)

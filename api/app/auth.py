from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .db import get_db
from .models import AdminSession, utcnow


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def verify_password(password: str) -> bool:
    if settings.admin_password_hash:
        try:
            return bcrypt.checkpw(password.encode(), settings.admin_password_hash.encode())
        except ValueError:
            return False
    if settings.admin_password:
        return hmac.compare_digest(password, settings.admin_password)
    return False


async def create_admin_session(db: AsyncSession) -> tuple[str, datetime]:
    token = secrets.token_urlsafe(36)
    expires = datetime.now(timezone.utc) + timedelta(hours=settings.admin_session_hours)
    db.add(
        AdminSession(
            token_hash=_hash_token(token),
            expires_at=expires.replace(tzinfo=None),
        )
    )
    # Opportunistic cleanup of expired sessions.
    await db.execute(delete(AdminSession).where(AdminSession.expires_at < utcnow()))
    await db.commit()
    return token, expires


def set_admin_cookie(response: Response, token: str, expires: datetime) -> None:
    response.set_cookie(
        key=settings.admin_cookie_name,
        value=token,
        httponly=True,
        secure=settings.effective_cookie_secure,
        samesite="lax",
        path="/",
        expires=expires,
    )


def clear_admin_cookie(response: Response) -> None:
    response.delete_cookie(
        settings.admin_cookie_name,
        path="/",
        httponly=True,
        secure=settings.effective_cookie_secure,
        samesite="lax",
    )


async def require_admin(
    request: Request, db: AsyncSession = Depends(get_db)
) -> AdminSession:
    token = request.cookies.get(settings.admin_cookie_name)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    session = await db.get(AdminSession, _hash_token(token))
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    expires = session.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        await db.delete(session)
        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
    session.last_seen = utcnow()
    await db.commit()
    return session


async def destroy_admin_session(request: Request, db: AsyncSession) -> None:
    token = request.cookies.get(settings.admin_cookie_name)
    if not token:
        return
    row = await db.get(AdminSession, _hash_token(token))
    if row:
        await db.delete(row)
        await db.commit()

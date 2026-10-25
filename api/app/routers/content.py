from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from ..content import get_content
from ..db import get_db

router = APIRouter(tags=["content"])


@router.get("/content")
async def read_content(response: Response, db: AsyncSession = Depends(get_db)) -> dict:
    doc = await get_content(db)
    response.headers["Cache-Control"] = "public, max-age=0, s-maxage=20, stale-while-revalidate=120"
    return doc


@router.get("/content/projects/{slug}")
async def read_project(slug: str, db: AsyncSession = Depends(get_db)) -> dict:
    doc = await get_content(db)
    project = next(
        (p for p in doc.get("projects", []) if p.get("slug") == slug), None
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"project": project, "meta": doc.get("meta", {})}

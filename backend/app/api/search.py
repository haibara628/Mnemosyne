"""Search API routes."""

from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.search import SearchResponse, SearchResult, SuggestItem
from app.services import search_service

router = APIRouter(prefix="/api/v1/search", tags=["search"])


@router.get("", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    results, total = await search_service.search_notes(
        db, query=q, limit=limit, offset=offset,
    )
    return SearchResponse(
        query=q,
        results=[SearchResult(**r) for r in results],
        total=total,
    )


@router.get("/suggest", response_model=List[SuggestItem])
async def suggest(
    q: str = Query(..., min_length=1),
    limit: int = Query(8, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    items = await search_service.suggest_notes(db, query=q, limit=limit)
    return [SuggestItem(**item) for item in items]

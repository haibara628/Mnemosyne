"""News articles API routes."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.article import Article
from app.schemas.news import ArticleOut, ArticleDetail, ArticleListResponse, NewsStats
from app.services import news_service

router = APIRouter(prefix="/api/v1/news", tags=["news"])


@router.get("", response_model=ArticleListResponse)
async def list_news(
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    items, total = await news_service.list_news(
        db, category=category, page=page, page_size=page_size
    )
    return ArticleListResponse(
        items=[ArticleOut.model_validate(a) for a in items],
        total=total, page=page, page_size=page_size,
    )


@router.get("/stats", response_model=NewsStats)
async def news_stats(db: AsyncSession = Depends(get_db)):
    total = (await db.execute(select(func.count(Article.id)))).scalar() or 0
    rows = (await db.execute(
        select(Article.category, func.count(Article.id)).group_by(Article.category)
    )).all()
    by_cat = {c: n for c, n in rows}
    last = (await db.execute(select(func.max(Article.created_at)))).scalar()
    return NewsStats(total=total, by_category=by_cat, last_collected_at=last)


@router.get("/{article_id}", response_model=ArticleDetail)
async def get_article(article_id: str, db: AsyncSession = Depends(get_db)):
    a = await news_service.get_article(db, article_id)
    if a is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return ArticleDetail.model_validate(a)


@router.post("/{article_id}/fetch", response_model=ArticleDetail)
async def fetch_content(article_id: str, db: AsyncSession = Depends(get_db)):
    a = await news_service.get_article(db, article_id)
    if a is None:
        raise HTTPException(status_code=404, detail="Article not found")
    try:
        await news_service.fetch_article_content(db, a)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"抓取失败: {e}") from e
    return ArticleDetail.model_validate(a)

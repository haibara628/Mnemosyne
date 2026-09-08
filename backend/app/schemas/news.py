"""Pydantic schemas for news articles."""

from typing import Dict, List, Optional

from pydantic import BaseModel


class ArticleOut(BaseModel):
    id: str
    title: str
    url: str
    source: str
    category: str
    summary: str
    published_at: str
    score: float
    authority: float
    readership: int
    importance: float
    has_content: bool = False
    created_at: str

    model_config = {"from_attributes": True}


class ArticleDetail(ArticleOut):
    content: Optional[str] = None


class ArticleListResponse(BaseModel):
    items: List[ArticleOut]
    total: int
    page: int
    page_size: int


class NewsStats(BaseModel):
    total: int
    by_category: Dict[str, int]
    last_collected_at: Optional[str] = None

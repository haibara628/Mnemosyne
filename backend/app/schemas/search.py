"""Pydantic schemas for search."""

from typing import List, Optional

from pydantic import BaseModel


class SearchResult(BaseModel):
    id: str
    title: str
    snippet: str
    score: Optional[float] = None


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    total: int


class SuggestItem(BaseModel):
    id: str
    title: str

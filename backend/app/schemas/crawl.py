"""Pydantic schemas for web crawl."""

from typing import List, Optional

from pydantic import BaseModel


class CrawlRequest(BaseModel):
    url: str


class CrawlTaskOut(BaseModel):
    id: str
    url: str
    title: Optional[str] = None
    status: str
    note_id: Optional[str] = None
    error_msg: Optional[str] = None
    created_at: str
    finished_at: Optional[str] = None

    model_config = {"from_attributes": True}


class CrawlTaskList(BaseModel):
    items: List[CrawlTaskOut]
    total: int

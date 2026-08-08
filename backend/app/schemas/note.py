"""Pydantic schemas for Note."""

from typing import List, Optional

from pydantic import BaseModel, Field


class TagOut(BaseModel):
    id: str
    name: str

    model_config = {"from_attributes": True}


class NoteCreate(BaseModel):
    title: str = "Untitled"
    content: str = ""
    tag_ids: List[str] = []


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_pinned: Optional[bool] = None
    tag_ids: Optional[List[str]] = None


class NoteSummary(BaseModel):
    """Lightweight note for list views."""
    id: str
    title: str
    is_pinned: bool
    tags: List[TagOut] = []
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class BacklinkInfo(BaseModel):
    note_id: str
    note_title: str
    context: Optional[str] = None


class OutlinkInfo(BaseModel):
    note_id: str
    note_title: str
    context: Optional[str] = None


class NoteDetail(BaseModel):
    """Full note with all relations."""
    id: str
    title: str
    content: str
    is_pinned: bool
    tags: List[TagOut] = []
    backlinks: List[BacklinkInfo] = []
    outlinks: List[OutlinkInfo] = []
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class NoteListResponse(BaseModel):
    items: List[NoteSummary]
    total: int
    page: int
    page_size: int

"""Pydantic schemas for Prompt."""

from typing import List, Optional

from pydantic import BaseModel


class PromptCreate(BaseModel):
    title: str = ""
    text: str = ""
    tags: str = ""  # 逗号分隔标签


class PromptUpdate(BaseModel):
    title: Optional[str] = None
    text: Optional[str] = None
    tags: Optional[str] = None


class PromptOut(BaseModel):
    id: str
    title: str
    text: str
    tags: str
    created_at: str

    model_config = {"from_attributes": True}


class PromptListResponse(BaseModel):
    items: List[PromptOut]
    total: int
    page: int
    page_size: int

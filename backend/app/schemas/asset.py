"""Pydantic schemas for Asset."""

from typing import List, Optional

from pydantic import BaseModel


class AssetCreate(BaseModel):
    type: str = "image"  # image | video | text | prompt | model
    title: str = ""
    path: str = ""
    eagle_id: Optional[str] = None


class AssetUpdate(BaseModel):
    type: Optional[str] = None
    title: Optional[str] = None
    path: Optional[str] = None
    eagle_id: Optional[str] = None


class AssetOut(BaseModel):
    id: str
    type: str
    title: str
    path: str
    eagle_id: Optional[str] = None
    created_at: str

    model_config = {"from_attributes": True}


class AssetListResponse(BaseModel):
    items: List[AssetOut]
    total: int
    page: int
    page_size: int

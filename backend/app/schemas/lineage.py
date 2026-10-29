"""Pydantic schemas for Lineage."""

from typing import List, Optional

from pydantic import BaseModel


class LineageCreate(BaseModel):
    source_type: str
    source_id: str
    target_type: str
    target_id: str
    relation: str
    context: Optional[str] = None


class LineageOut(BaseModel):
    id: str
    source_type: str
    source_id: str
    target_type: str
    target_id: str
    relation: str
    context: Optional[str] = None
    created_at: str

    model_config = {"from_attributes": True}


class LineageListResponse(BaseModel):
    items: List[LineageOut]
    total: int
    page: int
    page_size: int


class LineageNode(BaseModel):
    """血缘图节点,key 为 `type:id`。"""

    key: str
    type: str
    id: str
    label: Optional[str] = None


class LineageEdge(BaseModel):
    source: str  # 节点 key `type:id`
    target: str
    relation: str


class LineageTrace(BaseModel):
    nodes: List[LineageNode]
    edges: List[LineageEdge]

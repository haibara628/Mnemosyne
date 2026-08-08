"""Pydantic schemas for links and graph."""

from typing import List, Optional

from pydantic import BaseModel


class GraphNode(BaseModel):
    id: str
    label: str
    group: str = "note"


class GraphEdge(BaseModel):
    source: str
    target: str
    context: Optional[str] = None


class GraphData(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

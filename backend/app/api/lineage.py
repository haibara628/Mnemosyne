"""血缘(Lineage)API 路由:多态关系 CRUD + 上游追溯。"""

from collections import deque
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.asset import Asset
from app.models.lineage import Lineage
from app.models.model import Model
from app.models.note import Note
from app.models.prompt import Prompt
from app.models.task import Task
from app.schemas.lineage import (
    LineageCreate,
    LineageOut,
    LineageListResponse,
    LineageNode,
    LineageEdge,
    LineageTrace,
)

router = APIRouter(prefix="/api/v1/lineage", tags=["lineage"])


def _to_out(e: Lineage) -> LineageOut:
    return LineageOut(
        id=e.id,
        source_type=e.source_type, source_id=e.source_id,
        target_type=e.target_type, target_id=e.target_id,
        relation=e.relation, context=e.context, created_at=e.created_at,
    )


@router.get("", response_model=LineageListResponse)
async def list_lineage(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    source_type: Optional[str] = None,
    source_id: Optional[str] = None,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    relation: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """分页列出血缘边,可按源/目标/关系过滤。"""
    q = select(Lineage)
    if source_type:
        q = q.where(Lineage.source_type == source_type)
    if source_id:
        q = q.where(Lineage.source_id == source_id)
    if target_type:
        q = q.where(Lineage.target_type == target_type)
    if target_id:
        q = q.where(Lineage.target_id == target_id)
    if relation:
        q = q.where(Lineage.relation == relation)

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    result = await db.execute(
        q.order_by(Lineage.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    edges = result.scalars().all()
    return LineageListResponse(
        items=[_to_out(e) for e in edges],
        total=total, page=page, page_size=page_size,
    )


@router.post("", response_model=LineageOut, status_code=201)
async def create_lineage(body: LineageCreate, db: AsyncSession = Depends(get_db)):
    """创建一条血缘边(重复边会冲突,返回 409)。"""
    existing = (await db.execute(
        select(Lineage).where(
            Lineage.source_type == body.source_type,
            Lineage.source_id == body.source_id,
            Lineage.target_type == body.target_type,
            Lineage.target_id == body.target_id,
            Lineage.relation == body.relation,
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Lineage edge already exists")

    edge = Lineage(
        source_type=body.source_type, source_id=body.source_id,
        target_type=body.target_type, target_id=body.target_id,
        relation=body.relation, context=body.context,
    )
    db.add(edge)
    await db.commit()
    await db.refresh(edge)
    return _to_out(edge)


@router.get("/trace", response_model=LineageTrace)
async def trace_lineage(
    type: str = Query(..., description="实体类型:asset/model/prompt/task/note/project"),
    id: str = Query(..., description="实体 id"),
    db: AsyncSession = Depends(get_db),
):
    """追溯某个实体的上游血缘链路(BFS 沿 source→target 方向走)。"""
    nodes: dict[str, LineageNode] = {}
    edges: list[LineageEdge] = []
    visited: set[str] = set()
    queue = deque([(type, id)])

    while queue:
        t, i = queue.popleft()
        key = f"{t}:{i}"
        if key in visited:
            continue
        visited.add(key)

        label = await _get_label(db, t, i)
        nodes[key] = LineageNode(key=key, type=t, id=i, label=label)

        result = await db.execute(
            select(Lineage).where(Lineage.source_type == t, Lineage.source_id == i)
        )
        for edge in result.scalars().all():
            target_key = f"{edge.target_type}:{edge.target_id}"
            edges.append(LineageEdge(source=key, target=target_key, relation=edge.relation))
            queue.append((edge.target_type, edge.target_id))

    return LineageTrace(nodes=list(nodes.values()), edges=edges)


@router.get("/{edge_id}", response_model=LineageOut)
async def get_lineage(edge_id: str, db: AsyncSession = Depends(get_db)):
    edge = await db.get(Lineage, edge_id)
    if edge is None:
        raise HTTPException(status_code=404, detail="Lineage edge not found")
    return _to_out(edge)


@router.delete("/{edge_id}", status_code=204)
async def delete_lineage(edge_id: str, db: AsyncSession = Depends(get_db)):
    edge = await db.get(Lineage, edge_id)
    if edge is None:
        raise HTTPException(status_code=404, detail="Lineage edge not found")
    await db.delete(edge)
    await db.commit()


async def _get_label(db: AsyncSession, type: str, id: str) -> Optional[str]:
    """按实体类型取展示名,用于血缘图节点 label。"""
    model_cls = {
        "asset": Asset,
        "model": Model,
        "prompt": Prompt,
        "task": Task,
        "note": Note,
    }.get(type)

    if model_cls is None:
        # project 等自由文本类型:id 本身就是名称
        return id

    attr = {
        "asset": "title",
        "model": "name",
        "prompt": "title",
        "task": "title",
        "note": "title",
    }.get(type, "title")

    obj = await db.get(model_cls, id)
    if obj is None:
        return None
    return getattr(obj, attr, None)

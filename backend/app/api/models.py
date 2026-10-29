"""模型(Models)CRUD API 路由。"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.model import Model
from app.schemas.model import ModelCreate, ModelUpdate, ModelOut, ModelListResponse

router = APIRouter(prefix="/api/v1/models", tags=["models"])


def _to_out(m: Model) -> ModelOut:
    return ModelOut(id=m.id, name=m.name, kind=m.kind, path=m.path, created_at=m.created_at)


@router.get("", response_model=ModelListResponse)
async def list_models(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    kind: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """分页列出模型,可按 kind 过滤。"""
    q = select(Model)
    if kind:
        q = q.where(Model.kind == kind)

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    result = await db.execute(
        q.order_by(Model.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    models = result.scalars().all()
    return ModelListResponse(
        items=[_to_out(m) for m in models],
        total=total, page=page, page_size=page_size,
    )


@router.post("", response_model=ModelOut, status_code=201)
async def create_model(body: ModelCreate, db: AsyncSession = Depends(get_db)):
    model = Model(name=body.name, kind=body.kind, path=body.path)
    db.add(model)
    await db.commit()
    await db.refresh(model)
    return _to_out(model)


@router.get("/{model_id}", response_model=ModelOut)
async def get_model(model_id: str, db: AsyncSession = Depends(get_db)):
    model = await db.get(Model, model_id)
    if model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    return _to_out(model)


@router.put("/{model_id}", response_model=ModelOut)
async def update_model(model_id: str, body: ModelUpdate, db: AsyncSession = Depends(get_db)):
    model = await db.get(Model, model_id)
    if model is None:
        raise HTTPException(status_code=404, detail="Model not found")

    if body.name is not None:
        model.name = body.name
    if body.kind is not None:
        model.kind = body.kind
    if body.path is not None:
        model.path = body.path

    await db.commit()
    await db.refresh(model)
    return _to_out(model)


@router.delete("/{model_id}", status_code=204)
async def delete_model(model_id: str, db: AsyncSession = Depends(get_db)):
    model = await db.get(Model, model_id)
    if model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    await db.delete(model)
    await db.commit()

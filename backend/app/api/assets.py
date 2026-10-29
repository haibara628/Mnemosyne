"""素材(Assets)CRUD API 路由。"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.asset import Asset
from app.schemas.asset import AssetCreate, AssetUpdate, AssetOut, AssetListResponse

router = APIRouter(prefix="/api/v1/assets", tags=["assets"])


def _to_out(a: Asset) -> AssetOut:
    return AssetOut(
        id=a.id, type=a.type, title=a.title, path=a.path,
        eagle_id=a.eagle_id, created_at=a.created_at,
    )


@router.get("", response_model=AssetListResponse)
async def list_assets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """分页列出素材,可按 type 过滤。"""
    q = select(Asset)
    if type:
        q = q.where(Asset.type == type)

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    result = await db.execute(
        q.order_by(Asset.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    assets = result.scalars().all()
    return AssetListResponse(
        items=[_to_out(a) for a in assets],
        total=total, page=page, page_size=page_size,
    )


@router.post("", response_model=AssetOut, status_code=201)
async def create_asset(body: AssetCreate, db: AsyncSession = Depends(get_db)):
    asset = Asset(type=body.type, title=body.title, path=body.path, eagle_id=body.eagle_id)
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    return _to_out(asset)


@router.get("/{asset_id}", response_model=AssetOut)
async def get_asset(asset_id: str, db: AsyncSession = Depends(get_db)):
    asset = await db.get(Asset, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    return _to_out(asset)


@router.put("/{asset_id}", response_model=AssetOut)
async def update_asset(asset_id: str, body: AssetUpdate, db: AsyncSession = Depends(get_db)):
    asset = await db.get(Asset, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")

    if body.type is not None:
        asset.type = body.type
    if body.title is not None:
        asset.title = body.title
    if body.path is not None:
        asset.path = body.path
    if body.eagle_id is not None:
        asset.eagle_id = body.eagle_id

    await db.commit()
    await db.refresh(asset)
    return _to_out(asset)


@router.delete("/{asset_id}", status_code=204)
async def delete_asset(asset_id: str, db: AsyncSession = Depends(get_db)):
    asset = await db.get(Asset, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    await db.delete(asset)
    await db.commit()

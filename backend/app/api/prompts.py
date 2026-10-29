"""提示词(Prompts)CRUD API 路由。"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.prompt import Prompt
from app.schemas.prompt import PromptCreate, PromptUpdate, PromptOut, PromptListResponse

router = APIRouter(prefix="/api/v1/prompts", tags=["prompts"])


def _to_out(p: Prompt) -> PromptOut:
    return PromptOut(id=p.id, title=p.title, text=p.text, tags=p.tags, created_at=p.created_at)


@router.get("", response_model=PromptListResponse)
async def list_prompts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """分页列出提示词。"""
    count_q = select(func.count()).select_from(Prompt)
    total = (await db.execute(count_q)).scalar() or 0

    result = await db.execute(
        select(Prompt)
        .order_by(Prompt.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    prompts = result.scalars().all()
    return PromptListResponse(
        items=[_to_out(p) for p in prompts],
        total=total, page=page, page_size=page_size,
    )


@router.post("", response_model=PromptOut, status_code=201)
async def create_prompt(body: PromptCreate, db: AsyncSession = Depends(get_db)):
    prompt = Prompt(title=body.title, text=body.text, tags=body.tags)
    db.add(prompt)
    await db.commit()
    await db.refresh(prompt)
    return _to_out(prompt)


@router.get("/{prompt_id}", response_model=PromptOut)
async def get_prompt(prompt_id: str, db: AsyncSession = Depends(get_db)):
    prompt = await db.get(Prompt, prompt_id)
    if prompt is None:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return _to_out(prompt)


@router.put("/{prompt_id}", response_model=PromptOut)
async def update_prompt(prompt_id: str, body: PromptUpdate, db: AsyncSession = Depends(get_db)):
    prompt = await db.get(Prompt, prompt_id)
    if prompt is None:
        raise HTTPException(status_code=404, detail="Prompt not found")

    if body.title is not None:
        prompt.title = body.title
    if body.text is not None:
        prompt.text = body.text
    if body.tags is not None:
        prompt.tags = body.tags

    await db.commit()
    await db.refresh(prompt)
    return _to_out(prompt)


@router.delete("/{prompt_id}", status_code=204)
async def delete_prompt(prompt_id: str, db: AsyncSession = Depends(get_db)):
    prompt = await db.get(Prompt, prompt_id)
    if prompt is None:
        raise HTTPException(status_code=404, detail="Prompt not found")
    await db.delete(prompt)
    await db.commit()

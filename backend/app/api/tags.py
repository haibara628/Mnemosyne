"""Tags API routes."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.tag import Tag, note_tags_table
from app.schemas.tag import TagCreate, TagUpdate, TagOut

router = APIRouter(prefix="/api/v1/tags", tags=["tags"])


@router.get("", response_model=List[TagOut])
async def list_tags(db: AsyncSession = Depends(get_db)):
    """List all tags with note counts."""
    q = (
        select(
            Tag.id,
            Tag.name,
            func.count(note_tags_table.c.note_id).label("note_count"),
        )
        .outerjoin(note_tags_table, Tag.id == note_tags_table.c.tag_id)
        .group_by(Tag.id)
        .order_by(Tag.name)
    )
    result = await db.execute(q)
    rows = result.all()
    return [TagOut(id=row.id, name=row.name, note_count=row.note_count) for row in rows]


@router.post("", response_model=TagOut, status_code=201)
async def create_tag(body: TagCreate, db: AsyncSession = Depends(get_db)):
    """Create a new tag."""
    # Check duplicate
    existing = (await db.execute(select(Tag).where(Tag.name == body.name.strip()))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Tag already exists")

    tag = Tag(name=body.name.strip())
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    return TagOut(id=tag.id, name=tag.name, note_count=0)


@router.put("/{tag_id}", response_model=TagOut)
async def update_tag(tag_id: str, body: TagUpdate, db: AsyncSession = Depends(get_db)):
    """Rename a tag."""
    tag = await db.get(Tag, tag_id)
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")

    tag.name = body.name.strip()
    await db.commit()
    await db.refresh(tag)

    count = (await db.execute(
        select(func.count()).select_from(note_tags_table).where(note_tags_table.c.tag_id == tag.id)
    )).scalar() or 0
    return TagOut(id=tag.id, name=tag.name, note_count=count)


@router.delete("/{tag_id}", status_code=204)
async def delete_tag(tag_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a tag (cascade removes from note_tags)."""
    tag = await db.get(Tag, tag_id)
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    await db.delete(tag)
    await db.commit()

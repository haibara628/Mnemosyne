"""Notes API routes."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.note import (
    NoteCreate,
    NoteUpdate,
    NoteSummary,
    NoteDetail,
    NoteListResponse,
    BacklinkInfo,
    OutlinkInfo,
)
from app.services import note_service

router = APIRouter(prefix="/api/v1/notes", tags=["notes"])


@router.get("", response_model=NoteListResponse)
async def list_notes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tag_id: Optional[str] = None,
    sort_by: str = "updated_at",
    sort_desc: bool = True,
    db: AsyncSession = Depends(get_db),
):
    notes, total = await note_service.list_notes(
        db, page=page, page_size=page_size, tag_id=tag_id,
        sort_by=sort_by, sort_desc=sort_desc,
    )
    items = [
        NoteSummary(
            id=n.id, title=n.title, is_pinned=n.is_pinned,
            tags=[{"id": t.id, "name": t.name} for t in n.tags],
            created_at=n.created_at, updated_at=n.updated_at,
        )
        for n in notes
    ]
    return NoteListResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=NoteDetail, status_code=201)
async def create_note(body: NoteCreate, db: AsyncSession = Depends(get_db)):
    note = await note_service.create_note(
        db, title=body.title, content=body.content, tag_ids=body.tag_ids,
    )
    return await _build_detail(db, note)


@router.get("/{note_id}", response_model=NoteDetail)
async def get_note(note_id: str, db: AsyncSession = Depends(get_db)):
    note = await note_service.get_note(db, note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return await _build_detail(db, note)


@router.put("/{note_id}", response_model=NoteDetail)
async def update_note(note_id: str, body: NoteUpdate, db: AsyncSession = Depends(get_db)):
    note = await note_service.update_note(
        db, note_id,
        title=body.title, content=body.content,
        is_pinned=body.is_pinned, tag_ids=body.tag_ids,
    )
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return await _build_detail(db, note)


@router.delete("/{note_id}", status_code=204)
async def delete_note(note_id: str, db: AsyncSession = Depends(get_db)):
    deleted = await note_service.delete_note(db, note_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Note not found")


@router.get("/{note_id}/backlinks", response_model=List[BacklinkInfo])
async def get_backlinks(note_id: str, db: AsyncSession = Depends(get_db)):
    note = await note_service.get_note(db, note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return await note_service.get_backlinks(db, note_id)


@router.get("/{note_id}/outlinks", response_model=List[OutlinkInfo])
async def get_outlinks(note_id: str, db: AsyncSession = Depends(get_db)):
    note = await note_service.get_note(db, note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return await note_service.get_outlinks(db, note_id)


async def _build_detail(db: AsyncSession, note) -> NoteDetail:
    backlinks = await note_service.get_backlinks(db, note.id)
    outlinks = await note_service.get_outlinks(db, note.id)
    return NoteDetail(
        id=note.id,
        title=note.title,
        content=note.content,
        is_pinned=note.is_pinned,
        tags=[{"id": t.id, "name": t.name} for t in note.tags],
        backlinks=[BacklinkInfo(**bl) for bl in backlinks],
        outlinks=[OutlinkInfo(**ol) for ol in outlinks],
        created_at=note.created_at,
        updated_at=note.updated_at,
    )

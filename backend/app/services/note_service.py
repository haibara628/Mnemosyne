"""Note business logic: CRUD, tag management, backlink resolution."""

from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional, Tuple

from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.note import Note
from app.models.tag import Tag, NoteTag, note_tags_table
from app.models.link import Link
from app.utils.markdown import extract_unique_link_titles, strip_markdown


async def list_notes(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    tag_id: str | None = None,
    sort_by: str = "updated_at",
    sort_desc: bool = True,
) -> Tuple[List[Note], int]:
    """List notes with optional tag filter and pagination."""
    # Base query
    base_q = select(Note)

    if tag_id:
        base_q = base_q.join(Note.tags).where(Tag.id == tag_id)

    # Count total
    count_q = select(func.count()).select_from(base_q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Apply sorting and pagination
    sort_col = getattr(Note, sort_by, Note.updated_at)
    if sort_desc:
        sort_col = sort_col.desc()

    q = (
        base_q
        .options(selectinload(Note.tags))
        .order_by(sort_col)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(q)
    notes = list(result.scalars().unique().all())

    return notes, total


async def get_note(db: AsyncSession, note_id: str) -> Note | None:
    """Get a single note by ID with tags loaded."""
    q = select(Note).where(Note.id == note_id).options(selectinload(Note.tags))
    result = await db.execute(q)
    return result.scalar_one_or_none()


async def get_note_by_title(db: AsyncSession, title: str) -> Note | None:
    """Find a note by exact title match (for link resolution)."""
    q = select(Note).where(Note.title == title)
    result = await db.execute(q)
    return result.scalar_one_or_none()


async def create_note(db: AsyncSession, title: str, content: str, tag_ids: List[str] = []) -> Note:
    """Create a new note, sync tags and links."""
    content_text = strip_markdown(content)
    note = Note(title=title, content=content, content_text=content_text)

    # Attach tags
    if tag_ids:
        tag_q = select(Tag).where(Tag.id.in_(tag_ids))
        tags = (await db.execute(tag_q)).scalars().all()
        note.tags = list(tags)

    db.add(note)
    await db.flush()  # Get the note ID

    # Sync wiki links
    await sync_links_for_note(db, note)

    await db.commit()
    await db.refresh(note)
    return note


async def update_note(
    db: AsyncSession,
    note_id: str,
    title: str | None = None,
    content: str | None = None,
    is_pinned: bool | None = None,
    tag_ids: Optional[List[str]] = None,
) -> Note | None:
    """Update a note and re-sync links/tags."""
    note = await get_note(db, note_id)
    if note is None:
        return None

    if title is not None:
        note.title = title
    if content is not None:
        note.content = content
        note.content_text = strip_markdown(content)
    if is_pinned is not None:
        note.is_pinned = is_pinned

    note.updated_at = datetime.utcnow().isoformat()

    # Update tags if provided
    if tag_ids is not None:
        tag_q = select(Tag).where(Tag.id.in_(tag_ids))
        tags = (await db.execute(tag_q)).scalars().all()
        note.tags = list(tags)

    # Re-sync wiki links
    await sync_links_for_note(db, note)

    await db.commit()
    await db.refresh(note)
    return note


async def delete_note(db: AsyncSession, note_id: str) -> bool:
    """Delete a note. CASCADE handles links and note_tags."""
    note = await get_note(db, note_id)
    if note is None:
        return False
    await db.delete(note)
    await db.commit()
    return True


async def get_backlinks(db: AsyncSession, note_id: str) -> List[Dict]:
    """Get all notes that link TO this note."""
    q = (
        select(Link, Note.title)
        .join(Note, Link.source_note_id == Note.id)
        .where(Link.target_note_id == note_id)
    )
    result = await db.execute(q)
    rows = result.all()
    return [
        {"note_id": row.Link.source_note_id, "note_title": row.title, "context": row.Link.context}
        for row in rows
    ]


async def get_outlinks(db: AsyncSession, note_id: str) -> List[Dict]:
    """Get all notes that this note links TO."""
    q = (
        select(Link, Note.title)
        .join(Note, Link.target_note_id == Note.id)
        .where(Link.source_note_id == note_id)
    )
    result = await db.execute(q)
    rows = result.all()
    return [
        {"note_id": row.Link.target_note_id, "note_title": row.title, "context": row.Link.context}
        for row in rows
    ]


async def sync_links_for_note(db: AsyncSession, note: Note) -> None:
    """Parse [[wiki-links]] from note content and sync the links table."""
    # Remove existing outgoing links for this note
    await db.execute(
        delete(Link).where(Link.source_note_id == note.id)
    )

    titles = extract_unique_link_titles(note.content)
    for target_title in titles:
        target = await get_note_by_title(db, target_title)
        if target is None or target.id == note.id:
            continue  # Skip self-links and non-existent notes

        link = Link(
            source_note_id=note.id,
            target_note_id=target.id,
            context=None,
        )
        db.add(link)


async def get_stats(db: AsyncSession) -> dict:
    """Get basic statistics."""
    total_notes = (await db.execute(select(func.count(Note.id)))).scalar() or 0
    total_tags = (await db.execute(select(func.count(Tag.id)))).scalar() or 0
    total_links = (await db.execute(select(func.count(Link.id)))).scalar() or 0
    return {
        "total_notes": total_notes,
        "total_tags": total_tags,
        "total_links": total_links,
    }

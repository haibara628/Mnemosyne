"""Data export/import and stats API routes."""

import io
import zipfile
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.note import Note
from app.services.note_service import get_stats

router = APIRouter(prefix="/api/v1", tags=["data"])


@router.get("/stats")
async def stats(db: AsyncSession = Depends(get_db)):
    """Get knowledge base statistics."""
    return await get_stats(db)


@router.post("/export")
async def export_notes(db: AsyncSession = Depends(get_db)):
    """Export all notes as a zip of Markdown files."""
    result = await db.execute(select(Note).order_by(Note.title))
    notes = result.scalars().all()

    # Build in-memory zip
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        seen_names = set()
        for note in notes:
            # Sanitize filename
            safe_name = "".join(c if c.isalnum() or c in "._- " else "_" for c in note.title)
            safe_name = safe_name.strip()[:100] or "untitled"
            filename = f"{safe_name}.md"

            # Handle duplicates
            if filename in seen_names:
                base = safe_name
                i = 1
                while f"{base}_{i}.md" in seen_names:
                    i += 1
                filename = f"{base}_{i}.md"
            seen_names.add(filename)

            zf.writestr(filename, note.content)

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=cpkb_export.zip"},
    )

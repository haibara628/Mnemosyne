"""File upload / attachment API routes."""

from typing import Optional

import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.attachment import Attachment
from app.config import settings
from app.utils.file_handler import get_upload_path, detect_mime_type, is_previewable, get_preview_type

router = APIRouter(prefix="/api/v1/attachments", tags=["attachments"])


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    note_id: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """Upload a file attachment."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Check size
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.max_upload_size_mb:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max {settings.max_upload_size_mb}MB",
        )

    # Save to disk
    rel_path, abs_path = get_upload_path(file.filename)
    with open(abs_path, "wb") as f:
        f.write(content)

    mime_type = detect_mime_type(file.filename)

    attachment = Attachment(
        note_id=note_id if note_id else None,
        filename=file.filename,
        file_path=rel_path,
        mime_type=mime_type,
        size_bytes=len(content),
    )
    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)

    return {
        "id": attachment.id,
        "filename": attachment.filename,
        "mime_type": attachment.mime_type,
        "size_bytes": attachment.size_bytes,
        "preview_type": get_preview_type(mime_type),
        "previewable": is_previewable(mime_type),
        "url": f"/api/v1/attachments/{attachment.id}",
        "note_id": attachment.note_id,
        "created_at": attachment.created_at,
    }


@router.get("/{attachment_id}")
async def get_attachment(attachment_id: str, db: AsyncSession = Depends(get_db)):
    """Download or preview an attachment."""
    attachment = await db.get(Attachment, attachment_id)
    if attachment is None:
        raise HTTPException(status_code=404, detail="Attachment not found")

    abs_path = os.path.join(settings.upload_dir, attachment.file_path)
    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        abs_path,
        media_type=attachment.mime_type,
        filename=attachment.filename,
    )


@router.delete("/{attachment_id}", status_code=204)
async def delete_attachment(attachment_id: str, db: AsyncSession = Depends(get_db)):
    """Delete an attachment."""
    attachment = await db.get(Attachment, attachment_id)
    if attachment is None:
        raise HTTPException(status_code=404, detail="Attachment not found")

    abs_path = os.path.join(settings.upload_dir, attachment.file_path)
    if os.path.exists(abs_path):
        os.remove(abs_path)

    await db.delete(attachment)
    await db.commit()

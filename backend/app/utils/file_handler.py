"""File handling: save uploads, generate paths, detect MIME types."""

from __future__ import annotations

import os
import uuid
import mimetypes
from pathlib import Path

from app.config import settings


def get_upload_path(filename: str) -> tuple[str, str]:
    """Generate a unique storage path for an uploaded file.

    Returns (relative_path, absolute_path).
    Uses date-based subdirectories to avoid too many files in one folder.
    """
    from datetime import datetime

    today = datetime.utcnow().strftime("%Y/%m")
    unique_name = f"{uuid.uuid4().hex[:12]}_{filename}"

    rel_path = f"{today}/{unique_name}"
    abs_path = os.path.join(settings.upload_dir, rel_path)

    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    return rel_path, abs_path


def detect_mime_type(filename: str) -> str:
    """Detect MIME type from file extension."""
    mime_type, _ = mimetypes.guess_type(filename)
    return mime_type or "application/octet-stream"


def is_previewable(mime_type: str) -> bool:
    """Check if a MIME type can be previewed inline."""
    previewable = {
        "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
        "application/pdf",
        "text/plain", "text/html", "text/css", "text/javascript",
        "application/json",
        "audio/mpeg", "audio/wav", "audio/ogg",
        "video/mp4", "video/webm",
    }
    return mime_type in previewable


def get_preview_type(mime_type: str) -> str:
    """Get the preview category for a MIME type."""
    if mime_type.startswith("image/"):
        return "image"
    if mime_type == "application/pdf":
        return "pdf"
    if mime_type.startswith("audio/"):
        return "audio"
    if mime_type.startswith("video/"):
        return "video"
    if mime_type.startswith("text/"):
        return "text"
    return "download"

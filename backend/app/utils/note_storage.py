"""Note markdown body storage on disk (NAS) via aiofiles.

SQLite keeps only note metadata + content_text (FTS source); the full markdown
body is stored as a file at {notes_dir}/{note_id}.md.
"""

from __future__ import annotations

import asyncio
from pathlib import Path

import aiofiles

from app.config import settings


def note_path(note_id: str) -> Path:
    """Resolve the markdown file path for a note id."""
    return Path(settings.notes_dir) / f"{note_id}.md"


async def read_note_markdown(note_id: str) -> str:
    """Read a note's markdown body from disk. Returns "" if the file is missing."""
    path = note_path(note_id)
    try:
        async with aiofiles.open(path, "r", encoding="utf-8") as f:
            return await f.read()
    except FileNotFoundError:
        return ""


async def write_note_markdown(note_id: str, content: str) -> None:
    """Write a note's markdown body to disk, creating parent dirs as needed."""
    path = note_path(note_id)
    await asyncio.to_thread(path.parent.mkdir, parents=True, exist_ok=True)
    async with aiofiles.open(path, "w", encoding="utf-8") as f:
        await f.write(content)


async def delete_note_markdown(note_id: str) -> None:
    """Delete a note's markdown body. Missing file is not an error."""
    path = note_path(note_id)
    try:
        await asyncio.to_thread(path.unlink)
    except FileNotFoundError:
        pass

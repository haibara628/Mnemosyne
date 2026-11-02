"""One-time migration: move note markdown bodies from SQLite to NAS files.

Writes each note's `content` column to {notes_dir}/{id}.md, then drops the
`content` column from the `notes` table (SQLite 3.35+ supports DROP COLUMN).

Idempotent: notes whose .md file already exists are skipped, and re-running
after the column is dropped is a no-op.

Usage (from backend/):
    .venv/bin/python scripts/migrate_content_to_nas.py

Environment variables (same as the app):
    MNEMOSYNE_DATA_DIR   — SQLite location (default ./data)
    MNEMOSYNE_NOTES_DIR  — markdown body location (default {data_dir}/notes)
"""

from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

# Allow `from app.config import settings` when run as `python scripts/...`.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings  # noqa: E402


def main() -> None:
    db_path = Path(settings.data_dir) / "cpkb.db"
    if not db_path.exists():
        print(f"Database not found: {db_path}")
        sys.exit(1)

    if sqlite3.sqlite_version_info < (3, 35, 0):
        print(
            f"SQLite {sqlite3.sqlite_version} is too old for ALTER TABLE DROP COLUMN "
            "(need >= 3.35.0)."
        )
        sys.exit(1)

    notes_dir = Path(settings.notes_dir)
    notes_dir.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.cursor()

        columns = {row[1] for row in cur.execute("PRAGMA table_info(notes)")}
        if not columns:
            print("notes table is empty/missing — nothing to migrate.")
            return
        if "content" not in columns:
            print("notes.content column already removed — nothing to migrate.")
            return

        rows = cur.execute(
            "SELECT id, content FROM notes WHERE content IS NOT NULL AND content != ''"
        ).fetchall()

        migrated = 0
        skipped = 0
        for row in rows:
            note_id = row["id"]
            content = row["content"]
            target = notes_dir / f"{note_id}.md"
            if target.exists():
                skipped += 1
                continue
            target.write_text(content, encoding="utf-8")
            migrated += 1

        # Drop the column only after all bodies are safely on disk.
        cur.execute("ALTER TABLE notes DROP COLUMN content")
        conn.commit()

        print(
            f"Migrated {migrated} note(s) to {notes_dir} "
            f"({skipped} already present, skipped)."
        )
        print("Dropped notes.content column.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()

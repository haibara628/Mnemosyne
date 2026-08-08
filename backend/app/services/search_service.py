"""Full-text search service using SQLite FTS5."""

from __future__ import annotations

import re
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def search_notes(
    db: AsyncSession,
    query: str,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[dict], int]:
    """Search notes using FTS5 full-text search.

    Returns (results, total_count).
    """

    # Sanitize query for FTS5 — escape special chars and add prefix matching
    safe_query = _sanitize_fts_query(query)

    if not safe_query:
        return [], 0

    # FTS5 search with BM25 ordering
    count_sql = text("""
        SELECT COUNT(*) FROM notes_fts
        WHERE notes_fts MATCH :query
    """)
    total = (await db.execute(count_sql, {"query": safe_query})).scalar() or 0

    search_sql = text("""
        SELECT
            n.id,
            n.title,
            snippet(notes_fts, 1, '<mark>', '</mark>', '...', 40) AS snippet,
            rank
        FROM notes_fts
        JOIN notes n ON n.rowid = notes_fts.rowid
        WHERE notes_fts MATCH :query
        ORDER BY rank
        LIMIT :limit OFFSET :offset
    """)

    result = await db.execute(search_sql, {
        "query": safe_query,
        "limit": limit,
        "offset": offset,
    })
    rows = result.all()

    results = [
        {
            "id": row.id,
            "title": row.title,
            "snippet": row.snippet or "",
            "score": getattr(row, "rank", None),
        }
        for row in rows
    ]

    return results, total


async def suggest_notes(db: AsyncSession, query: str, limit: int = 8) -> list[dict]:
    """Quick title-prefix suggestions for autocomplete."""
    # Try FTS first, fall back to LIKE
    safe_query = _sanitize_fts_query(query)

    if safe_query:
        sql = text("""
            SELECT n.id, n.title
            FROM notes_fts
            JOIN notes n ON n.rowid = notes_fts.rowid
            WHERE notes_fts MATCH :query
            ORDER BY rank
            LIMIT :limit
        """)
        result = await db.execute(sql, {"query": f"title:{safe_query}", "limit": limit})
    else:
        sql = text("""
            SELECT id, title FROM notes
            WHERE title LIKE :pattern
            ORDER BY updated_at DESC
            LIMIT :limit
        """)
        result = await db.execute(sql, {"pattern": f"%{query}%", "limit": limit})

    return [{"id": row.id, "title": row.title} for row in result.all()]


def _sanitize_fts_query(query: str) -> str:
    """Sanitize user input for FTS5 query syntax.

    Removes dangerous characters and adds prefix matching with *.
    """
    if not query or not query.strip():
        return ""

    # Remove FTS5 special characters
    cleaned = re.sub(r'[^\w\s"*]', "", query.strip())

    if not cleaned:
        return ""

    # Split into tokens, add * for prefix matching on the last token
    tokens = cleaned.split()
    if not tokens:
        return ""

    # Wrap each token in quotes if it contains spaces (but we split on spaces, so just add *)
    processed = []
    for i, token in enumerate(tokens):
        if token.upper() in ("AND", "OR", "NOT", "NEAR"):
            processed.append(token)
        elif i == len(tokens) - 1:
            # Last token gets prefix match
            processed.append(f"{token}*")
        else:
            processed.append(f"{token}*")

    return " AND ".join(processed)

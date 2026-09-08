"""Async SQLAlchemy engine, session factory, and table initialization."""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import text, event

from app.config import settings

engine = create_async_engine(settings.database_url, echo=False, connect_args={"timeout": 30})
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@event.listens_for(engine.sync_engine, "connect")
def _sqlite_pragmas(dbapi_connection, connection_record):
    """Enable WAL + busy timeout so the hourly collector can write alongside the API."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA busy_timeout=30000")
    cursor.close()


async def get_db() -> AsyncSession:
    """FastAPI dependency: yields an async database session."""
    async with async_session() as session:
        yield session


async def init_db():
    """Create all tables and FTS5 virtual tables. Called at app startup."""
    async with engine.begin() as conn:
        # Core tables
        await conn.run_sync(_create_tables_sync)

    # FTS5 virtual tables need raw SQL (not supported by SQLAlchemy ORM)
    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
                title,
                content_text,
                content='notes',
                content_rowid='rowid'
            )
        """))

    # Create triggers for FTS sync
    async with engine.begin() as conn:
        for trigger in _FTS_TRIGGERS:
            await conn.execute(text(trigger))


def _create_tables_sync(conn):
    """Synchronous table creation called via run_sync."""
    from app.models.base import Base
    from app.models.note import Note  # noqa: F401 — ensure models are loaded
    from app.models.link import Link  # noqa: F401
    from app.models.tag import Tag, NoteTag  # noqa: F401
    from app.models.attachment import Attachment  # noqa: F401
    from app.models.crawl_task import CrawlTask  # noqa: F401
    from app.models.article import Article  # noqa: F401
    Base.metadata.create_all(conn)


_FTS_TRIGGERS = [
    """
    CREATE TRIGGER IF NOT EXISTS notes_fts_insert AFTER INSERT ON notes BEGIN
        INSERT INTO notes_fts(rowid, title, content_text)
        VALUES (new.rowid, new.title, new.content_text);
    END
    """,
    """
    CREATE TRIGGER IF NOT EXISTS notes_fts_delete AFTER DELETE ON notes BEGIN
        INSERT INTO notes_fts(notes_fts, rowid, title, content_text)
        VALUES ('delete', old.rowid, old.title, old.content_text);
    END
    """,
    """
    CREATE TRIGGER IF NOT EXISTS notes_fts_update AFTER UPDATE ON notes BEGIN
        INSERT INTO notes_fts(notes_fts, rowid, title, content_text)
        VALUES ('delete', old.rowid, old.title, old.content_text);
        INSERT INTO notes_fts(rowid, title, content_text)
        VALUES (new.rowid, new.title, new.content_text);
    END
    """,
]

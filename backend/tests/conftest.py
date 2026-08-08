"""Shared fixtures for backend tests."""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.database import get_db
from app.main import app
from app.models.base import Base

# In-memory SQLite for tests
TEST_DATABASE_URL = "sqlite+aiosqlite://"

FTS_TRIGGERS = [
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


@pytest_asyncio.fixture
async def async_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Create FTS5 virtual table
        await conn.execute(text(
            "CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5("
            "title, content_text, content='notes', content_rowid='rowid')"
        ))
        # Create FTS sync triggers
        for trigger_sql in FTS_TRIGGERS:
            await conn.execute(text(trigger_sql))
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(async_engine):
    async_session = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()

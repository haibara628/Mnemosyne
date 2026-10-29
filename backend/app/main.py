"""FastAPI application entry point."""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import init_db
from app.api import notes, search, links, tags, attachments, crawl, export, news
from app.api import assets, models, prompts, tasks, lineage, settings as settings_api


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    # Startup: ensure DB and tables exist
    await init_db()
    yield
    # Shutdown: nothing special needed


app = FastAPI(
    title="CPKB — Personal Knowledge Base",
    description="A self-hosted personal knowledge base with bidirectional links, full-text search, and AI capabilities.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8000", "http://127.0.0.1:5173", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(notes.router)
app.include_router(search.router)
app.include_router(links.router)
app.include_router(tags.router)
app.include_router(attachments.router)
app.include_router(crawl.router)
app.include_router(export.router)
app.include_router(news.router)
app.include_router(assets.router)
app.include_router(models.router)
app.include_router(prompts.router)
app.include_router(tasks.router)
app.include_router(lineage.router)
app.include_router(settings_api.router)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}


# Serve frontend static files in production (must be after all API routes)
frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")

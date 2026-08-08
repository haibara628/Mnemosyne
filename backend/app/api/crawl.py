"""Web crawl API routes."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.crawl_task import CrawlTask
from app.schemas.crawl import CrawlRequest, CrawlTaskOut, CrawlTaskList
from app.services import crawl_service

router = APIRouter(prefix="/api/v1/crawl", tags=["crawl"])


@router.post("", response_model=CrawlTaskOut, status_code=202)
async def submit_crawl(body: CrawlRequest, db: AsyncSession = Depends(get_db)):
    """Submit a URL for crawling. Returns immediately with task status."""
    task = await crawl_service.submit_crawl(db, url=body.url)
    return CrawlTaskOut(
        id=task.id, url=task.url, title=task.title,
        status=task.status, note_id=task.note_id,
        error_msg=task.error_msg,
        created_at=task.created_at, finished_at=task.finished_at,
    )


@router.get("/tasks", response_model=CrawlTaskList)
async def list_tasks(
    db: AsyncSession = Depends(get_db),
    status: Optional[str] = None,
):
    """List crawl tasks, optionally filtered by status."""
    q = select(CrawlTask)
    if status:
        q = q.where(CrawlTask.status == status)
    q = q.order_by(CrawlTask.created_at.desc()).limit(50)

    result = await db.execute(q)
    tasks = result.scalars().all()

    total = (await db.execute(select(func.count(CrawlTask.id)))).scalar() or 0

    return CrawlTaskList(
        items=[CrawlTaskOut(
            id=t.id, url=t.url, title=t.title, status=t.status,
            note_id=t.note_id, error_msg=t.error_msg,
            created_at=t.created_at, finished_at=t.finished_at,
        ) for t in tasks],
        total=total,
    )


@router.get("/{task_id}", response_model=CrawlTaskOut)
async def get_task(task_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single crawl task by ID."""
    task = await db.get(CrawlTask, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return CrawlTaskOut(
        id=task.id, url=task.url, title=task.title, status=task.status,
        note_id=task.note_id, error_msg=task.error_msg,
        created_at=task.created_at, finished_at=task.finished_at,
    )

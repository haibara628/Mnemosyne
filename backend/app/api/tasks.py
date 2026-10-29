"""任务(Tasks)CRUD API 路由。"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate, TaskOut, TaskListResponse

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


def _to_out(t: Task) -> TaskOut:
    return TaskOut(
        id=t.id, title=t.title, status=t.status, priority=t.priority,
        due_date=t.due_date, project=t.project,
        created_at=t.created_at, updated_at=t.updated_at,
    )


@router.get("", response_model=TaskListResponse)
async def list_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    project: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """分页列出任务,可按 status / project 过滤。"""
    q = select(Task)
    if status:
        q = q.where(Task.status == status)
    if project:
        q = q.where(Task.project == project)

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    result = await db.execute(
        q.order_by(Task.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    tasks = result.scalars().all()
    return TaskListResponse(
        items=[_to_out(t) for t in tasks],
        total=total, page=page, page_size=page_size,
    )


@router.post("", response_model=TaskOut, status_code=201)
async def create_task(body: TaskCreate, db: AsyncSession = Depends(get_db)):
    task = Task(
        title=body.title, status=body.status, priority=body.priority,
        due_date=body.due_date, project=body.project,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return _to_out(task)


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(task_id: str, db: AsyncSession = Depends(get_db)):
    task = await db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return _to_out(task)


@router.put("/{task_id}", response_model=TaskOut)
async def update_task(task_id: str, body: TaskUpdate, db: AsyncSession = Depends(get_db)):
    task = await db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    if body.title is not None:
        task.title = body.title
    if body.status is not None:
        task.status = body.status
    if body.priority is not None:
        task.priority = body.priority
    if body.due_date is not None:
        task.due_date = body.due_date
    if body.project is not None:
        task.project = body.project

    await db.commit()
    await db.refresh(task)
    return _to_out(task)


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: str, db: AsyncSession = Depends(get_db)):
    task = await db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)
    await db.commit()

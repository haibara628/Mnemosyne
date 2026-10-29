"""Pydantic schemas for Task."""

from typing import List, Optional

from pydantic import BaseModel


class TaskCreate(BaseModel):
    title: str = ""
    status: str = "todo"  # todo | doing | done
    priority: str = "medium"  # low | medium | high
    due_date: Optional[str] = None
    project: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    project: Optional[str] = None


class TaskOut(BaseModel):
    id: str
    title: str
    status: str
    priority: str
    due_date: Optional[str] = None
    project: Optional[str] = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class TaskListResponse(BaseModel):
    items: List[TaskOut]
    total: int
    page: int
    page_size: int

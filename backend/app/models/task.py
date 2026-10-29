"""任务(Task)模型:个人工作台的日程/待办。"""

from typing import Optional

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from app.models.base import Base
from app.models.note import generate_ulid


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(26), primary_key=True, default=generate_ulid)
    title: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    # todo | doing | done
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="todo", index=True)
    # low | medium | high
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="medium", index=True)
    # ISO 日期字符串,如 2026-10-30
    due_date: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    # 所属项目名(自由文本,暂无独立 projects 表)
    project: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, index=True)
    created_at: Mapped[str] = mapped_column(
        String(30), default=lambda: datetime.utcnow().isoformat()
    )
    updated_at: Mapped[str] = mapped_column(
        String(30),
        default=lambda: datetime.utcnow().isoformat(),
        onupdate=lambda: datetime.utcnow().isoformat(),
    )

    def __repr__(self) -> str:
        return f"<Task {self.id[:8]}… title={self.title!r} status={self.status!r}>"

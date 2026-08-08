"""Crawl task model for web page fetching."""

from typing import Optional

from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from app.models.base import Base
from app.models.note import generate_ulid


class CrawlTask(Base):
    __tablename__ = "crawl_tasks"

    id: Mapped[str] = mapped_column(String(26), primary_key=True, default=generate_ulid)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending/fetching/done/failed
    note_id: Mapped[Optional[str]] = mapped_column(
        String(26), ForeignKey("notes.id", ondelete="SET NULL"), nullable=True
    )
    error_msg: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(
        String(30), default=lambda: datetime.utcnow().isoformat()
    )
    finished_at: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

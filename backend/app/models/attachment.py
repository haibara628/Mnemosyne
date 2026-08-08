"""Attachment model for file uploads."""

from typing import Optional

from sqlalchemy import String, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from app.models.base import Base
from app.models.note import generate_ulid


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[str] = mapped_column(String(26), primary_key=True, default=generate_ulid)
    note_id: Mapped[Optional[str]] = mapped_column(
        String(26), ForeignKey("notes.id", ondelete="SET NULL"), nullable=True
    )
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(200), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[str] = mapped_column(
        String(30), default=lambda: datetime.utcnow().isoformat()
    )

    note = relationship("Note", back_populates="attachments")

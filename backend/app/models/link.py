"""Bidirectional link model."""

from typing import Optional

from sqlalchemy import String, Text, Integer, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from app.models.base import Base
from app.models.note import generate_ulid


class Link(Base):
    __tablename__ = "links"
    __table_args__ = (
        UniqueConstraint("source_note_id", "target_note_id", name="uq_source_target"),
    )

    id: Mapped[str] = mapped_column(String(26), primary_key=True, default=generate_ulid)
    source_note_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    target_note_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    context: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(
        String(30), default=lambda: datetime.utcnow().isoformat()
    )

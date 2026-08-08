"""Note model."""

from ulid import ULID
from sqlalchemy import String, Text, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from app.models.base import Base


def generate_ulid() -> str:
    return str(ULID())


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[str] = mapped_column(String(26), primary_key=True, default=generate_ulid)
    title: Mapped[str] = mapped_column(String(500), nullable=False, default="Untitled")
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    content_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    is_pinned: Mapped[bool] = mapped_column(Integer, default=0)
    created_at: Mapped[str] = mapped_column(
        String(30), default=lambda: datetime.utcnow().isoformat()
    )
    updated_at: Mapped[str] = mapped_column(
        String(30),
        default=lambda: datetime.utcnow().isoformat(),
        onupdate=lambda: datetime.utcnow().isoformat(),
    )

    # Relationships
    tags = relationship("Tag", secondary="note_tags", back_populates="notes", lazy="selectin")
    attachments = relationship("Attachment", back_populates="note", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Note {self.id[:8]}… title={self.title!r}>"

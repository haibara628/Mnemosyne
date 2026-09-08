"""Article model for auto-collected news items."""

from typing import Optional

from sqlalchemy import String, Text, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from app.models.base import Base
from app.models.note import generate_ulid


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[str] = mapped_column(String(26), primary_key=True, default=generate_ulid)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    source: Mapped[str] = mapped_column(String(100), nullable=False)  # "Hacker News", "Reuters"...
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="tech")  # tech / finance / ai
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    published_at: Mapped[str] = mapped_column(String(30), nullable=False, default="")
    score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    authority: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    readership: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # HN points + comments
    importance: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # lazily fetched full text (markdown)
    created_at: Mapped[str] = mapped_column(
        String(30), default=lambda: datetime.utcnow().isoformat()
    )

    @property
    def has_content(self) -> bool:
        return bool(self.content)

    def __repr__(self) -> str:
        return f"<Article {self.id[:8]}… {self.title[:30]!r} score={self.score}>"

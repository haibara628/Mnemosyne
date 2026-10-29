"""提示词(Prompt)模型。tags 以逗号分隔字符串存储。"""

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from app.models.base import Base
from app.models.note import generate_ulid


class Prompt(Base):
    __tablename__ = "prompts"

    id: Mapped[str] = mapped_column(String(26), primary_key=True, default=generate_ulid)
    title: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # 逗号分隔的标签,如 "portrait,realistic"
    tags: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[str] = mapped_column(
        String(30), default=lambda: datetime.utcnow().isoformat()
    )

    def __repr__(self) -> str:
        return f"<Prompt {self.id[:8]}… title={self.title!r}>"

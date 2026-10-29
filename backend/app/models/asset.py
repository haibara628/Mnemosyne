"""素材(Asset)模型:图片/视频/文本/提示词/模型等创作素材。"""

from typing import Optional

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from app.models.base import Base
from app.models.note import generate_ulid


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(String(26), primary_key=True, default=generate_ulid)
    # image | video | text | prompt | model
    type: Mapped[str] = mapped_column(String(20), nullable=False, default="image", index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    # 文件路径或 eagle:// 链接
    path: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # Eagle 素材库里的 id(若有)
    eagle_id: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, index=True)
    created_at: Mapped[str] = mapped_column(
        String(30), default=lambda: datetime.utcnow().isoformat()
    )

    def __repr__(self) -> str:
        return f"<Asset {self.id[:8]}… type={self.type!r} title={self.title!r}>"

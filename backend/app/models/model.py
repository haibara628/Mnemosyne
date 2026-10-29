"""模型(Model)记录:checkpoint / lora 等生成模型。"""

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from app.models.base import Base
from app.models.note import generate_ulid


class Model(Base):
    __tablename__ = "models"

    id: Mapped[str] = mapped_column(String(26), primary_key=True, default=generate_ulid)
    name: Mapped[str] = mapped_column(String(300), nullable=False, default="", index=True)
    # checkpoint | lora | vae | embedding | ...
    kind: Mapped[str] = mapped_column(String(30), nullable=False, default="checkpoint", index=True)
    path: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[str] = mapped_column(
        String(30), default=lambda: datetime.utcnow().isoformat()
    )

    def __repr__(self) -> str:
        return f"<Model {self.id[:8]}… name={self.name!r} kind={self.kind!r}>"

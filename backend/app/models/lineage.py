"""血缘(Lineage)模型:跨实体类型的多态关系表。

存四类关系(以素材为源):
  - 素材 --generated_by--> 模型
  - 素材 --uses_prompt--> 提示词
  - 素材 --derived_from--> 源素材
  - 素材 --belongs_to--> 项目(项目为自由文本,无独立表)

source/target 用 (type, id) 定位任意实体,不强加外键约束。
"""

from typing import Optional

from sqlalchemy import String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from app.models.base import Base
from app.models.note import generate_ulid


class Lineage(Base):
    __tablename__ = "lineage"
    __table_args__ = (
        UniqueConstraint(
            "source_type", "source_id", "target_type", "target_id", "relation",
            name="uq_lineage_edge",
        ),
    )

    id: Mapped[str] = mapped_column(String(26), primary_key=True, default=generate_ulid)
    source_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    source_id: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    target_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    target_id: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    # generated_by | uses_prompt | derived_from | belongs_to | ...
    relation: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    context: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(
        String(30), default=lambda: datetime.utcnow().isoformat()
    )

    def __repr__(self) -> str:
        return (
            f"<Lineage {self.source_type}:{self.source_id[:8]}… "
            f"--{self.relation}--> {self.target_type}:{self.target_id[:8]}…>"
        )

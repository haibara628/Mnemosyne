"""Tag and NoteTag association models."""

from sqlalchemy import String, ForeignKey, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.note import generate_ulid

# Association table for Note <-> Tag many-to-many
note_tags_table = Table(
    "note_tags",
    Base.metadata,
    Column("note_id", String(26), ForeignKey("notes.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", String(26), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[str] = mapped_column(String(26), primary_key=True, default=generate_ulid)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)

    notes = relationship("Note", secondary=note_tags_table, back_populates="tags", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Tag {self.name!r}>"


# Re-export for convenience
NoteTag = note_tags_table

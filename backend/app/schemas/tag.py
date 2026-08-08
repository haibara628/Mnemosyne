"""Pydantic schemas for Tag."""

from pydantic import BaseModel


class TagCreate(BaseModel):
    name: str


class TagUpdate(BaseModel):
    name: str


class TagOut(BaseModel):
    id: str
    name: str
    note_count: int = 0

    model_config = {"from_attributes": True}

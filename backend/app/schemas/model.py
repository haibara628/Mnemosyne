"""Pydantic schemas for Model."""

from typing import List, Optional

from pydantic import BaseModel


class ModelCreate(BaseModel):
    name: str = ""
    kind: str = "checkpoint"  # checkpoint | lora | vae | embedding | ...
    path: str = ""


class ModelUpdate(BaseModel):
    name: Optional[str] = None
    kind: Optional[str] = None
    path: Optional[str] = None


class ModelOut(BaseModel):
    id: str
    name: str
    kind: str
    path: str
    created_at: str

    model_config = {"from_attributes": True}


class ModelListResponse(BaseModel):
    items: List[ModelOut]
    total: int
    page: int
    page_size: int

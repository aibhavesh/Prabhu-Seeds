from datetime import datetime
from typing import Any
from pydantic import BaseModel


class ActivityTypeBase(BaseModel):
    name: str
    department: str
    season: str | None = None
    fields_schema: dict[str, Any] | None = None


class ActivityTypeCreate(ActivityTypeBase):
    pass


class ActivityTypeUpdate(BaseModel):
    name: str | None = None
    department: str | None = None
    season: str | None = None
    fields_schema: dict[str, Any] | None = None
    is_active: bool | None = None


class ActivityTypeOut(ActivityTypeBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}

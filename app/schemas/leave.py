import uuid
from datetime import date, datetime
from pydantic import BaseModel


class LeaveCreate(BaseModel):
    from_date: date
    to_date: date
    type: str  # casual|sick|earned|unpaid
    reason: str | None = None


class LeaveUpdate(BaseModel):
    status: str | None = None  # approved|rejected


class LeaveOut(BaseModel):
    id: int
    user_id: uuid.UUID
    from_date: date
    to_date: date
    type: str
    reason: str | None
    status: str
    approved_by: uuid.UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}

import uuid
from datetime import date as _Date, datetime
from pydantic import BaseModel, model_validator

VALID_LEAVE_TYPES = {"casual", "sick", "earned", "unpaid"}


class LeaveCreate(BaseModel):
    from_date: _Date
    to_date: _Date
    type: str  # casual|sick|earned|unpaid
    reason: str | None = None


class LeaveUpdate(BaseModel):
    status: str | None = None  # approved|rejected


class LeaveOut(BaseModel):
    id: int
    user_id: uuid.UUID
    from_date: _Date
    to_date: _Date
    type: str
    reason: str | None
    status: str
    approved_by: uuid.UUID | None
    created_at: datetime
    duration_days: int = 1

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def compute_duration(self) -> "LeaveOut":
        self.duration_days = max(1, (self.to_date - self.from_date).days + 1)
        return self

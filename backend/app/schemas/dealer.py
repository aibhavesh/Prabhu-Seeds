import uuid
from datetime import datetime
from pydantic import BaseModel


class DealerBase(BaseModel):
    name: str
    district_id: str | None = None
    contact: str | None = None
    mobile: str | None = None


class DealerCreate(DealerBase):
    pass


class DealerUpdate(BaseModel):
    name: str | None = None
    district_id: str | None = None
    contact: str | None = None
    mobile: str | None = None


class DealerOut(DealerBase):
    id: int
    added_by: uuid.UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class DealerAssignmentCreate(BaseModel):
    dealer_id: int
    user_id: uuid.UUID


class DealerAssignmentOut(BaseModel):
    id: int
    dealer_id: int
    user_id: uuid.UUID

    model_config = {"from_attributes": True}

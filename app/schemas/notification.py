import uuid
from datetime import datetime
from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: int
    user_id: uuid.UUID
    type: str
    message: str
    read_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationCreate(BaseModel):
    user_id: uuid.UUID
    type: str
    message: str


class MarkReadRequest(BaseModel):
    notification_ids: list[int]

import uuid
from datetime import date as _Date, datetime
from decimal import Decimal
from pydantic import BaseModel


class TaskRecordCreate(BaseModel):
    village: str | None = None
    tehsil: str | None = None
    district: str | None = None
    farmer_name: str | None = None
    farmer_contact: str | None = None
    land_acres: Decimal | None = None
    photo_url: str | None = None


class TaskRecordOut(BaseModel):
    id: int
    task_id: int
    submitted_by: uuid.UUID | None
    village: str | None
    tehsil: str | None
    district: str | None
    farmer_name: str | None
    farmer_contact: str | None
    land_acres: Decimal | None
    photo_url: str | None
    submitted_at: datetime

    model_config = {"from_attributes": True}


class TaskCreate(BaseModel):
    title: str
    assigned_to: uuid.UUID | None = None
    district_id: str | None = None
    dept: str | None = None
    activity_type: str | None = None
    crop: str | None = None
    product: str | None = None
    target: int = 1
    unit: str = "NOS"
    deadline: _Date | None = None


class TaskUpdate(BaseModel):
    status: str | None = None  # running|hold|completed
    title: str | None = None
    target: int | None = None
    deadline: _Date | None = None


class TaskOut(BaseModel):
    id: int
    title: str
    created_by: uuid.UUID | None
    assigned_to: uuid.UUID | None
    assigned_to_name: str | None = None
    district_id: str | None
    dept: str | None
    activity_type: str | None
    crop: str | None
    product: str | None
    target: int
    unit: str
    status: str
    deadline: _Date | None
    started_at: _Date | None
    created_at: datetime
    record_count: int = 0

    model_config = {"from_attributes": True}


class TaskMeta(BaseModel):
    total: int
    pending: int
    active: int
    efficiency: int


class TaskListResponse(BaseModel):
    tasks: list[TaskOut]
    meta: TaskMeta

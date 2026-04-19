import uuid
from datetime import date as _Date, datetime
from decimal import Decimal
from pydantic import BaseModel


class CheckInRequest(BaseModel):
    lat: Decimal
    lng: Decimal


class CheckOutRequest(BaseModel):
    lat: Decimal
    lng: Decimal
    km: Decimal


class WaypointCreate(BaseModel):
    attendance_id: int
    lat: Decimal
    lng: Decimal
    timestamp: datetime
    stop_label: str | None = None
    type: str = "stop"


class WaypointOut(BaseModel):
    id: int
    lat: Decimal
    lng: Decimal
    timestamp: datetime
    stop_label: str | None
    type: str | None

    model_config = {"from_attributes": True}


class AttendanceOut(BaseModel):
    id: int
    user_id: uuid.UUID
    date: _Date
    check_in: datetime | None
    check_out: datetime | None
    km: Decimal
    status: str
    waypoints: list[WaypointOut] = []

    model_config = {"from_attributes": True}


class AttendanceListOut(BaseModel):
    """Lightweight schema for list endpoints — no waypoints, avoids N+1 queries."""
    id: int
    user_id: uuid.UUID
    date: _Date
    check_in: datetime | None
    check_out: datetime | None
    km: Decimal
    status: str

    model_config = {"from_attributes": True}


class TeamAttendanceOut(BaseModel):
    """One row in the manager/owner team attendance view."""
    id: int
    user_id: uuid.UUID
    name: str
    department: str
    date: _Date
    check_in: datetime | None
    check_out: datetime | None
    km: Decimal
    status: str

from pydantic import BaseModel, ConfigDict
from typing import Any
from datetime import datetime


class ActivityAttributeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    activity_type_id: int
    label: str
    field_key: str
    field_type: str
    is_required: bool
    options: dict | None = None
    placeholder: str | None = None
    sort_order: int


class ActivityAttributeCreate(BaseModel):
    activity_type_id: int
    label: str
    field_key: str
    field_type: str
    is_required: bool = False
    options: dict | None = None
    placeholder: str | None = None
    sort_order: int = 0


class FeedbackResponseCreate(BaseModel):
    field_key: str
    value_text: str | None = None
    value_json: Any = None


class FarmerFeedbackCreate(BaseModel):
    activity_type_id: int
    farmer_name: str
    farmer_phone: str | None = None
    village: str | None = None
    district_id: str | None = None
    location_lat: float | None = None
    location_lng: float | None = None
    notes: str | None = None
    local_id: str | None = None
    responses: list[FeedbackResponseCreate] = []


class FeedbackResponseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    field_key: str
    value_text: str | None = None
    value_json: Any = None


class ActivityMediaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    field_key: str
    media_url: str
    media_type: str


class FarmerFeedbackOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    activity_type_id: int
    farmer_name: str
    farmer_phone: str | None = None
    village: str | None = None
    district_id: str | None = None
    location_lat: float | None = None
    location_lng: float | None = None
    notes: str | None = None
    status: str
    local_id: str | None = None
    submitted_at: datetime
    responses: list[FeedbackResponseOut] = []
    media: list[ActivityMediaOut] = []


class FarmerFeedbackListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    activity_type_id: int
    farmer_name: str
    village: str | None = None
    status: str
    submitted_at: datetime

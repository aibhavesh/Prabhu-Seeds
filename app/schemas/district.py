import uuid
from pydantic import BaseModel


class DistrictBase(BaseModel):
    id: str
    name: str
    state: str


class DistrictCreate(DistrictBase):
    pass


class DistrictOut(DistrictBase):
    model_config = {"from_attributes": True}


class DistrictAssignmentCreate(BaseModel):
    user_id: uuid.UUID
    district_id: str


class DistrictAssignmentOut(BaseModel):
    id: int
    user_id: uuid.UUID
    district_id: str

    model_config = {"from_attributes": True}

import uuid
from datetime import date as _Date, datetime
from decimal import Decimal
from pydantic import BaseModel


class ExpenseCreate(BaseModel):
    date: _Date
    type: str  # travel|hotel|food|other
    description: str | None = None
    amount: Decimal
    km: Decimal | None = None
    rate: Decimal | None = None
    bill_url: str | None = None


class ExpenseUpdate(BaseModel):
    status: str | None = None  # approved|rejected


class ExpenseOut(BaseModel):
    id: int
    user_id: uuid.UUID
    date: _Date
    type: str
    description: str | None
    amount: Decimal
    km: Decimal | None
    rate: Decimal | None
    status: str
    approved_by: uuid.UUID | None
    bill_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}

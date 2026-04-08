import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, model_validator


class OrderItemCreate(BaseModel):
    product_id: str
    qty: int
    rate: Decimal


class OrderItemOut(BaseModel):
    id: int
    order_id: str
    product_id: str | None
    qty: int
    rate: Decimal

    model_config = {"from_attributes": True}


class OrderCreate(BaseModel):
    dealer_id: int
    items: list[OrderItemCreate]
    date: date | None = None


class OrderUpdate(BaseModel):
    status: str | None = None  # dispatched|delivered
    paid: Decimal | None = None


class OrderOut(BaseModel):
    id: str
    dealer_id: int | None
    created_by: uuid.UUID | None
    date: date
    status: str
    paid: Decimal
    created_at: datetime
    items: list[OrderItemOut] = []

    model_config = {"from_attributes": True}

    @property
    def total(self) -> Decimal:
        return sum(item.qty * item.rate for item in self.items)

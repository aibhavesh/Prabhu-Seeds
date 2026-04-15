from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class ProductBase(BaseModel):
    id: str
    name: str
    code: str | None = None
    category: str | None = None
    crop: str | None = None
    season: str | None = None
    price: Decimal
    stock: int = 0


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    category: str | None = None
    crop: str | None = None
    season: str | None = None
    price: Decimal | None = None
    stock: int | None = None


class ProductOut(ProductBase):
    created_at: datetime

    model_config = {"from_attributes": True}

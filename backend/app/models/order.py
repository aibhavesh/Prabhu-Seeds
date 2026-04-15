import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, Integer, Numeric, Date, ForeignKey, TIMESTAMP, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # ORD-001
    dealer_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("dealers.id"), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    date: Mapped[date] = mapped_column(Date, server_default=text("CURRENT_DATE"))
    status: Mapped[str] = mapped_column(String, default="pending")  # pending|dispatched|delivered
    paid: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0"))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("NOW()"))

    dealer: Mapped["Dealer | None"] = relationship("Dealer", back_populates="orders")  # type: ignore[name-defined]
    creator: Mapped["User | None"] = relationship("User", foreign_keys=[created_by])  # type: ignore[name-defined]
    items: Mapped[list["OrderItem"]] = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[str] = mapped_column(String, ForeignKey("orders.id", ondelete="CASCADE"))
    product_id: Mapped[str | None] = mapped_column(String, ForeignKey("products.id"), nullable=True)
    qty: Mapped[int] = mapped_column(Integer, nullable=False)
    rate: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)

    order: Mapped[Order] = relationship("Order", back_populates="items")
    product: Mapped["Product | None"] = relationship("Product")  # type: ignore[name-defined]

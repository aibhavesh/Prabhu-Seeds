import uuid
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, TIMESTAMP, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Dealer(Base):
    __tablename__ = "dealers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    district_id: Mapped[str | None] = mapped_column(String, ForeignKey("districts.id"), nullable=True)
    contact: Mapped[str | None] = mapped_column(String, nullable=True)
    mobile: Mapped[str | None] = mapped_column(String, nullable=True)
    added_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("NOW()"))

    district: Mapped["District | None"] = relationship("District")  # type: ignore[name-defined]
    added_by_user: Mapped["User | None"] = relationship("User", foreign_keys=[added_by])  # type: ignore[name-defined]
    assignments: Mapped[list["DealerAssignment"]] = relationship("DealerAssignment", back_populates="dealer", cascade="all, delete-orphan")
    orders: Mapped[list["Order"]] = relationship("Order", back_populates="dealer")  # type: ignore[name-defined]


class DealerAssignment(Base):
    __tablename__ = "dealer_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    dealer_id: Mapped[int] = mapped_column(Integer, ForeignKey("dealers.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))

    __table_args__ = (UniqueConstraint("dealer_id", "user_id"),)

    dealer: Mapped[Dealer] = relationship("Dealer", back_populates="assignments")
    user: Mapped["User"] = relationship("User", back_populates="dealer_assignments")  # type: ignore[name-defined]

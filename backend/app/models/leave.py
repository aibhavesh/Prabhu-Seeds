import uuid
from datetime import date, datetime
from sqlalchemy import String, Integer, Date, ForeignKey, TIMESTAMP, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Leave(Base):
    __tablename__ = "leaves"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    from_date: Mapped[date] = mapped_column(Date, nullable=False)
    to_date: Mapped[date] = mapped_column(Date, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)  # casual|sick|earned|unpaid
    reason: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="pending")  # pending|approved|rejected
    approved_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("NOW()"))

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])  # type: ignore[name-defined]
    approver: Mapped["User | None"] = relationship("User", foreign_keys=[approved_by])  # type: ignore[name-defined]

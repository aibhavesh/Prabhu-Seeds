import uuid
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, TIMESTAMP, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    type: Mapped[str] = mapped_column(String, nullable=False)  # task_assigned|leave_approved|travel_claim_status|general
    message: Mapped[str] = mapped_column(String, nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("NOW()"))

    user: Mapped["User"] = relationship("User")  # type: ignore[name-defined]

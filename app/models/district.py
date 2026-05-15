import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, TIMESTAMP, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class District(Base):
    __tablename__ = "districts"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # e.g. "mahasamund"
    name: Mapped[str] = mapped_column(String, nullable=False)
    state: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("NOW()"))

    assignments: Mapped[list["DistrictAssignment"]] = relationship("DistrictAssignment", back_populates="district")


class DistrictAssignment(Base):
    __tablename__ = "district_assignments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    district_id: Mapped[str] = mapped_column(String, ForeignKey("districts.id", ondelete="CASCADE"))

    user: Mapped["User"] = relationship("User", back_populates="district_assignments")  # type: ignore[name-defined]
    district: Mapped[District] = relationship("District", back_populates="assignments")

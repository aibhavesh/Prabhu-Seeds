import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, Integer, Numeric, Date, ForeignKey, TIMESTAMP, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Attendance(Base):
    __tablename__ = "attendance"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    date: Mapped[date] = mapped_column(Date, nullable=False)
    check_in: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    check_out: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    km: Mapped[Decimal] = mapped_column(Numeric(6, 1), default=Decimal("0"))
    status: Mapped[str] = mapped_column(String, default="active")  # active|done

    __table_args__ = (UniqueConstraint("user_id", "date"),)

    user: Mapped["User"] = relationship("User")  # type: ignore[name-defined]
    waypoints: Mapped[list["GpsWaypoint"]] = relationship("GpsWaypoint", back_populates="attendance", cascade="all, delete-orphan")


class GpsWaypoint(Base):
    __tablename__ = "gps_waypoints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    attendance_id: Mapped[int] = mapped_column(Integer, ForeignKey("attendance.id", ondelete="CASCADE"))
    lat: Mapped[Decimal] = mapped_column(Numeric(10, 7), nullable=False)
    lng: Mapped[Decimal] = mapped_column(Numeric(10, 7), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    stop_label: Mapped[str | None] = mapped_column(String, nullable=True)
    type: Mapped[str | None] = mapped_column(String, nullable=True)  # checkin|checkout|stop|break

    attendance: Mapped[Attendance] = relationship("Attendance", back_populates="waypoints")

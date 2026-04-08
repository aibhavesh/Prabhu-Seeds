import uuid
from datetime import date, datetime
from sqlalchemy import String, Integer, Numeric, Date, ForeignKey, TIMESTAMP, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    district_id: Mapped[str | None] = mapped_column(String, ForeignKey("districts.id"), nullable=True)
    dept: Mapped[str | None] = mapped_column(String, nullable=True)  # Marketing|Production|R&D|Processing
    activity_type: Mapped[str | None] = mapped_column(String, nullable=True)
    crop: Mapped[str | None] = mapped_column(String, nullable=True)
    product: Mapped[str | None] = mapped_column(String, nullable=True)
    target: Mapped[int] = mapped_column(Integer, default=1)
    unit: Mapped[str] = mapped_column(String, default="NOS")  # NOS|DAYS|KG
    status: Mapped[str] = mapped_column(String, default="assigned")  # assigned|running|hold|completed
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    started_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("NOW()"))

    creator: Mapped["User | None"] = relationship("User", foreign_keys=[created_by])  # type: ignore[name-defined]
    assignee: Mapped["User | None"] = relationship("User", foreign_keys=[assigned_to])  # type: ignore[name-defined]
    district: Mapped["District | None"] = relationship("District")  # type: ignore[name-defined]
    records: Mapped[list["TaskRecord"]] = relationship("TaskRecord", back_populates="task", cascade="all, delete-orphan")


class TaskRecord(Base):
    __tablename__ = "task_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_id: Mapped[int] = mapped_column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"))
    submitted_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    village: Mapped[str | None] = mapped_column(String, nullable=True)
    tehsil: Mapped[str | None] = mapped_column(String, nullable=True)
    district: Mapped[str | None] = mapped_column(String, nullable=True)
    farmer_name: Mapped[str | None] = mapped_column(String, nullable=True)
    farmer_contact: Mapped[str | None] = mapped_column(String, nullable=True)
    land_acres: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("NOW()"))

    task: Mapped[Task] = relationship("Task", back_populates="records")
    submitter: Mapped["User | None"] = relationship("User", foreign_keys=[submitted_by])  # type: ignore[name-defined]

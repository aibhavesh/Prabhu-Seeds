import uuid
from sqlalchemy import Integer, String, Boolean, ForeignKey, JSON, Numeric, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import text
from app.core.database import Base


class ActivityAttribute(Base):
    __tablename__ = "activity_attributes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    activity_type_id: Mapped[int] = mapped_column(Integer, ForeignKey("activity_types.id", ondelete="CASCADE"))
    label: Mapped[str] = mapped_column(String(200))
    field_key: Mapped[str] = mapped_column(String(100))
    field_type: Mapped[str] = mapped_column(String(50))
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)
    options: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    placeholder: Mapped[str | None] = mapped_column(String(300), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[str] = mapped_column(TIMESTAMP(timezone=True), server_default=text("NOW()"))


class FarmerFeedback(Base):
    __tablename__ = "farmer_feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    activity_type_id: Mapped[int] = mapped_column(Integer, ForeignKey("activity_types.id"))
    # users.id is UUID — must match
    submitted_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    farmer_name: Mapped[str] = mapped_column(String(200))
    farmer_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    village: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # districts.id is String (slug like "mahasamund") — must match
    district_id: Mapped[str | None] = mapped_column(String, ForeignKey("districts.id"), nullable=True)
    location_lat: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    location_lng: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="submitted")
    local_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    submitted_at: Mapped[str] = mapped_column(TIMESTAMP(timezone=True), server_default=text("NOW()"))

    responses: Mapped[list["FarmerFeedbackResponse"]] = relationship(
        "FarmerFeedbackResponse", back_populates="feedback", cascade="all, delete-orphan"
    )
    media: Mapped[list["ActivityMedia"]] = relationship(
        "ActivityMedia", back_populates="feedback", cascade="all, delete-orphan"
    )


class FarmerFeedbackResponse(Base):
    __tablename__ = "farmer_feedback_responses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    feedback_id: Mapped[int] = mapped_column(Integer, ForeignKey("farmer_feedback.id", ondelete="CASCADE"))
    field_key: Mapped[str] = mapped_column(String(100))
    value_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    value_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[str] = mapped_column(TIMESTAMP(timezone=True), server_default=text("NOW()"))

    feedback: Mapped["FarmerFeedback"] = relationship("FarmerFeedback", back_populates="responses")


class ActivityMedia(Base):
    __tablename__ = "activity_media"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    feedback_id: Mapped[int] = mapped_column(Integer, ForeignKey("farmer_feedback.id", ondelete="CASCADE"))
    field_key: Mapped[str] = mapped_column(String(100))
    media_url: Mapped[str] = mapped_column(Text)
    media_type: Mapped[str] = mapped_column(String(20), default="image")
    created_at: Mapped[str] = mapped_column(TIMESTAMP(timezone=True), server_default=text("NOW()"))

    feedback: Mapped["FarmerFeedback"] = relationship("FarmerFeedback", back_populates="media")

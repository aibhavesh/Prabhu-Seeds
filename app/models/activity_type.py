from datetime import datetime
from sqlalchemy import String, Integer, Text, TIMESTAMP, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class ActivityType(Base):
    __tablename__ = "activity_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    department: Mapped[str] = mapped_column(String, nullable=False)  # Marketing|Production|R&D|Processing
    season: Mapped[str | None] = mapped_column(String, nullable=True)  # Pre-season|Post-season|Always
    fields_schema: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # dynamic field definitions
    is_active: Mapped[bool] = mapped_column(default=True, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("NOW()"))

import uuid
from datetime import date as date_type, datetime, timezone
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.attendance import Attendance, GpsWaypoint
from app.schemas.attendance import CheckInRequest, CheckOutRequest, WaypointCreate
from app.integrations.google_maps import calculate_route_km

DAILY_KM_LIMIT = 21.0


async def check_in(user_id: uuid.UUID, data: CheckInRequest, db: AsyncSession) -> Attendance:
    today = date_type.today()

    existing = await db.execute(select(Attendance).where(Attendance.user_id == user_id, Attendance.date == today))
    if existing.scalar_one_or_none():
        raise ValueError("Already checked in today")

    attendance = Attendance(user_id=user_id, date=today, check_in=datetime.now(timezone.utc))
    db.add(attendance)
    await db.flush()

    waypoint = GpsWaypoint(
        attendance_id=attendance.id,
        lat=data.lat,
        lng=data.lng,
        timestamp=attendance.check_in,
        type="checkin",
        stop_label="Check In",
    )
    db.add(waypoint)
    await db.commit()
    await db.refresh(attendance)
    return attendance


async def check_out(user_id: uuid.UUID, data: CheckOutRequest, db: AsyncSession) -> Attendance:
    today = date_type.today()
    result = await db.execute(
        select(Attendance).where(Attendance.user_id == user_id, Attendance.date == today)
    )
    attendance = result.scalar_one_or_none()
    if not attendance:
        raise ValueError("No check-in found for today")

    attendance.check_out = datetime.now(timezone.utc)
    attendance.km = data.km
    attendance.status = "done"

    waypoint = GpsWaypoint(
        attendance_id=attendance.id,
        lat=data.lat,
        lng=data.lng,
        timestamp=attendance.check_out,
        type="checkout",
        stop_label="Check Out",
    )
    db.add(waypoint)
    await db.commit()
    await db.refresh(attendance)
    return attendance


async def add_waypoint(data: WaypointCreate, db: AsyncSession) -> GpsWaypoint:
    wp = GpsWaypoint(**data.model_dump())
    db.add(wp)
    await db.commit()
    await db.refresh(wp)
    return wp


async def get_today_attendance(user_id: uuid.UUID, db: AsyncSession) -> Attendance | None:
    result = await db.execute(
        select(Attendance)
        .options(selectinload(Attendance.waypoints))
        .where(Attendance.user_id == user_id, Attendance.date == date_type.today())
    )
    return result.scalar_one_or_none()

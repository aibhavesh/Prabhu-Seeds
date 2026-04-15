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

    result = await db.execute(
        select(Attendance)
        .where(Attendance.user_id == user_id, Attendance.date == today)
    )
    existing = result.scalar_one_or_none()

    if existing:
        if existing.check_out is None:
            raise ValueError("Already checked in today")
        # Previous session completed — allow re-check-in by resetting the record
        existing.check_in = datetime.now(timezone.utc)
        existing.check_out = None
        existing.km = Decimal("0")
        existing.status = "active"
        waypoint = GpsWaypoint(
            attendance_id=existing.id,
            lat=data.lat,
            lng=data.lng,
            timestamp=existing.check_in,
            type="checkin",
            stop_label="Check In",
        )
        db.add(waypoint)
        await db.commit()
        await db.refresh(existing)
        return existing

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
        select(Attendance)
        .options(selectinload(Attendance.waypoints))
        .where(Attendance.user_id == user_id, Attendance.date == today)
    )
    attendance = result.scalar_one_or_none()
    if not attendance:
        raise ValueError("No check-in found for today")

    checkout_time = datetime.now(timezone.utc)

    # Add checkout waypoint
    checkout_wp = GpsWaypoint(
        attendance_id=attendance.id,
        lat=data.lat,
        lng=data.lng,
        timestamp=checkout_time,
        type="checkout",
        stop_label="Check Out",
    )
    db.add(checkout_wp)
    await db.flush()  # get checkout_wp into memory before distance calc

    # Auto-calculate km: sum Haversine distances across all waypoints
    all_wps = sorted(
        [*attendance.waypoints, checkout_wp],
        key=lambda w: w.timestamp,
    )
    if len(all_wps) >= 2:
        coords = [(float(w.lat), float(w.lng)) for w in all_wps]
        computed_km = calculate_route_km(coords)
    else:
        # Only one waypoint (check-in = check-out spot) — use client value as fallback
        computed_km = float(data.km)

    attendance.check_out = checkout_time
    attendance.km = Decimal(str(computed_km))
    attendance.status = "done"

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

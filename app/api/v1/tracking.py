"""
Live field-force tracking endpoint.
Returns all FIELD/MANAGER users checked in today with their latest GPS position.
Polled by the frontend every 30 s; also supports Supabase realtime push on gps_waypoints.
"""
from datetime import date as _date
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models.attendance import Attendance, GpsWaypoint
from app.models.user import User

router = APIRouter()


@router.get("/live")
async def live_positions(
    current_user: Annotated[User, Depends(require_roles("OWNER", "MANAGER"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """
    Return all field staff currently checked in (check_in set, check_out NULL today).
    Each entry includes their latest GPS waypoint so the map marker is up-to-date.
    Managers only see their own subordinates; OWNER sees everyone.
    """
    today = _date.today()

    # Load all active check-ins for today — filter by role in Python to avoid
    # a double-JOIN on User (once for WHERE, once for the relationship load).
    stmt = (
        select(Attendance)
        .where(
            Attendance.date == today,
            Attendance.check_in.is_not(None),
            Attendance.check_out.is_(None),
        )
        .options(
            selectinload(Attendance.user),
            selectinload(Attendance.waypoints),
        )
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    # Role + active filter in Python
    records = [
        r for r in records
        if r.user
        and r.user.role in ("FIELD", "MANAGER")
        and r.user.is_active
    ]

    # Manager role: only see their own subordinates
    if current_user.role == "MANAGER":
        records = [r for r in records if r.user.manager_id == current_user.id]

    employees = []
    for record in records:
        # Latest waypoint → most accurate current position
        waypoints = sorted(record.waypoints, key=lambda w: w.timestamp, reverse=True)
        latest_wp = waypoints[0] if waypoints else None

        lat = float(latest_wp.lat) if latest_wp else 0.0
        lng = float(latest_wp.lng) if latest_wp else 0.0
        last_seen = (
            latest_wp.timestamp.isoformat()
            if latest_wp
            else record.check_in.isoformat()
        )

        employees.append({
            "user_id": str(record.user_id),
            "name": record.user.name,
            "department": None,          # User model has no dept — frontend defaults to green
            "state": record.user.state,
            "assigned_state": record.user.state,
            "lat": lat,
            "lng": lng,
            "accuracy": 0,
            "last_seen": last_seen,
            "current_location": record.user.hq,  # hq city used as location label
            "outside_state": False,
        })

    return {"employees": employees}

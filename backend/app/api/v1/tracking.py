"""
Live field-force tracking endpoint.
Returns all FIELD/MANAGER users checked in today with their latest GPS position.
Polled by the frontend every 30 s; also supports Supabase realtime push on gps_waypoints.
"""
import asyncio
from datetime import date as _date
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models.attendance import Attendance
from app.models.user import User
from app.integrations.google_maps import reverse_geocode_state

router = APIRouter()

DEPT_LABEL = {
    "FIELD":    "Field Ops",
    "MANAGER":  "Management",
    "ACCOUNTS": "Accounts",
    "OWNER":    "HQ",
}


@router.get("/live")
async def live_positions(
    current_user: Annotated[User, Depends(require_roles("OWNER", "MANAGER"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """
    Return all field staff currently checked in (check_in set, check_out NULL today).
    State is determined by reverse-geocoding the employee's latest GPS waypoint.
    """
    today = _date.today()

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

    # Role + active filter
    records = [
        r for r in records
        if r.user and r.user.role.upper() in ("FIELD", "MANAGER") and r.user.is_active
    ]

    if current_user.role.upper() == "MANAGER":
        mgr_id_str = str(current_user.id)
        records = [r for r in records if str(r.user.manager_id) == mgr_id_str]

    # Build base employee dicts
    raw = []
    for record in records:
        waypoints = sorted(record.waypoints, key=lambda w: w.timestamp, reverse=True)
        latest_wp = waypoints[0] if waypoints else None

        lat = float(latest_wp.lat) if latest_wp else 0.0
        lng = float(latest_wp.lng) if latest_wp else 0.0
        accuracy = float(latest_wp.accuracy) if (latest_wp and latest_wp.accuracy is not None) else None
        last_seen = (
            latest_wp.timestamp.isoformat()
            if latest_wp
            else record.check_in.isoformat()
        )

        raw.append({
            "user_id":    str(record.user_id),
            "name":       record.user.name,
            "department": DEPT_LABEL.get(record.user.role, record.user.role.title()),
            "lat":        lat,
            "lng":        lng,
            "accuracy":   accuracy,
            "last_seen":  last_seen,
        })

    # Reverse-geocode all employees concurrently
    states = await asyncio.gather(
        *[reverse_geocode_state(e["lat"], e["lng"]) for e in raw]
    )

    employees = [
        {
            **e,
            "state": state or "—",
        }
        for e, state in zip(raw, states)
        if not (e["lat"] == 0.0 and e["lng"] == 0.0)
    ]

    return {"employees": employees}

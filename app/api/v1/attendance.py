from typing import Annotated
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.attendance import Attendance
from app.schemas.attendance import CheckInRequest, CheckOutRequest, WaypointCreate, AttendanceOut, WaypointOut
from app.services import attendance_service
from app.services.visibility import get_subordinate_ids

router = APIRouter()


@router.get("/", response_model=list[AttendanceOut])
async def list_attendance(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    user_id: str | None = Query(default=None),
    skip: int = 0,
    limit: int = 100,
) -> list:
    """Team attendance list for managers/owners; own records for field staff."""
    from sqlalchemy.orm import selectinload
    import uuid as uuid_mod

    sub_ids = await get_subordinate_ids(current_user.id, db)

    q = select(Attendance).options(selectinload(Attendance.waypoints))

    if current_user.role not in ("OWNER",):
        visible_ids = [current_user.id, *sub_ids]
        q = q.where(Attendance.user_id.in_(visible_ids))

    if user_id:
        q = q.where(Attendance.user_id == uuid_mod.UUID(user_id))
    if date_from:
        q = q.where(Attendance.date >= date_from)
    if date_to:
        q = q.where(Attendance.date <= date_to)

    q = q.order_by(Attendance.date.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


@router.get("/report")
async def attendance_report(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    month: date | None = Query(default=None),
) -> dict:
    """Monthly attendance summary — count of days per user."""
    from sqlalchemy import func, extract
    from datetime import date as date_type

    today = date_type.today()
    yr = month.year if month else today.year
    mo = month.month if month else today.month

    sub_ids = await get_subordinate_ids(current_user.id, db)

    q = (
        select(Attendance.user_id, func.count(Attendance.id).label("days"))
        .where(
            func.extract("year", Attendance.date) == yr,
            func.extract("month", Attendance.date) == mo,
        )
        .group_by(Attendance.user_id)
    )
    if current_user.role not in ("OWNER",):
        visible_ids = [current_user.id, *sub_ids]
        q = q.where(Attendance.user_id.in_(visible_ids))

    rows = (await db.execute(q)).all()
    return {
        "month": f"{yr}-{mo:02d}",
        "summary": [{"user_id": str(r.user_id), "days_present": r.days} for r in rows],
    }


@router.get("/today", response_model=AttendanceOut | None)
async def get_today(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    return await attendance_service.get_today_attendance(current_user.id, db)


@router.post("/check-in", response_model=AttendanceOut, status_code=status.HTTP_201_CREATED)
async def check_in(
    body: CheckInRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    try:
        return await attendance_service.check_in(current_user.id, body, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/check-out", response_model=AttendanceOut)
async def check_out(
    body: CheckOutRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    try:
        return await attendance_service.check_out(current_user.id, body, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/waypoints", response_model=WaypointOut, status_code=status.HTTP_201_CREATED)
async def add_waypoint(
    body: WaypointCreate,
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    return await attendance_service.add_waypoint(body, db)

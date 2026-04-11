from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.attendance import CheckInRequest, CheckOutRequest, WaypointCreate, AttendanceOut, WaypointOut
from app.services import attendance_service

router = APIRouter()


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


@router.get("/", response_model=list[AttendanceOut])
async def list_attendance(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 100,
) -> list:
    """List attendance records for the current user."""
    from sqlalchemy import select
    from app.models.attendance import Attendance
    result = await db.execute(
        select(Attendance)
        .where(Attendance.user_id == current_user.id)
        .order_by(Attendance.date.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())


@router.get("/report")
async def attendance_report(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Aggregated attendance summary for the current user."""
    from sqlalchemy import select, func
    from app.models.attendance import Attendance
    total = await db.scalar(
        select(func.count()).select_from(Attendance).where(Attendance.user_id == current_user.id)
    )
    present = await db.scalar(
        select(func.count()).select_from(Attendance).where(
            Attendance.user_id == current_user.id,
            Attendance.check_in.isnot(None),
        )
    )
    return {"total": total or 0, "present": present or 0}

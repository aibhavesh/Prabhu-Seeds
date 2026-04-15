from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User
from app.schemas.leave import LeaveCreate, LeaveUpdate, LeaveOut
from app.services import leave_service

router = APIRouter()


@router.get("/", response_model=list[LeaveOut])
async def list_leaves(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 200,
    scope: str | None = None,   # "self" | "team"
    status: str | None = None,  # "pending" | "approved" | "rejected"
    view: str | None = None,    # reserved for future (history, balances)
) -> list:
    leaves = await leave_service.list_leaves(
        current_user, db, skip=skip, limit=limit, scope=scope
    )
    if status:
        leaves = [lv for lv in leaves if lv.status == status]
    return leaves


@router.post("/", response_model=LeaveOut, status_code=status.HTTP_201_CREATED)
async def create_leave(
    body: LeaveCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    try:
        return await leave_service.create_leave(body, current_user.id, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))


@router.patch("/{leave_id}/status", response_model=LeaveOut)
async def update_leave_status(
    leave_id: int,
    body: LeaveUpdate,
    current_user: Annotated[User, Depends(require_roles("OWNER", "MANAGER"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    leave = await leave_service.update_leave_status(leave_id, body, current_user.id, db)
    if not leave:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave not found")
    return leave


class LeaveDecision(BaseModel):
    decision: str  # approved | rejected


@router.patch("/{leave_id}", response_model=LeaveOut)
async def review_leave(
    leave_id: int,
    body: LeaveDecision,
    current_user: Annotated[User, Depends(require_roles("OWNER", "MANAGER"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    """Frontend-facing endpoint: PATCH /leaves/{id} with { decision: 'approved'|'rejected' }"""
    allowed = {"approved", "rejected"}
    if body.decision not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"decision must be one of {allowed}",
        )
    leave = await leave_service.update_leave_status(
        leave_id, LeaveUpdate(status=body.decision), current_user.id, db
    )
    if not leave:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave not found")
    return leave

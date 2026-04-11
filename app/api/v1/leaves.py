from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User
from app.schemas.leave import LeaveCreate, LeaveUpdate, LeaveOut
from app.services import leave_service


class LeaveDecision(BaseModel):
    decision: str  # approved | rejected

router = APIRouter()


@router.get("/", response_model=list[LeaveOut])
async def list_leaves(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 100,
) -> list:
    return await leave_service.list_leaves(current_user, db, skip=skip, limit=limit)


@router.post("/", response_model=LeaveOut, status_code=status.HTTP_201_CREATED)
async def create_leave(
    body: LeaveCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    return await leave_service.create_leave(body, current_user.id, db)


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


@router.patch("/{leave_id}", response_model=LeaveOut)
async def review_leave(
    leave_id: int,
    body: LeaveDecision,
    current_user: Annotated[User, Depends(require_roles("OWNER", "MANAGER"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    """Frontend uses PATCH /{id} with { decision } to approve/reject."""
    allowed = {"approved", "rejected"}
    if body.decision not in allowed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"decision must be one of {allowed}")
    leave = await leave_service.update_leave_status(
        leave_id, LeaveUpdate(status=body.decision), current_user.id, db
    )
    if not leave:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave not found")
    return leave

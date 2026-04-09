from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.notification import NotificationOut, NotificationCreate, MarkReadRequest
from app.services import notification_service

router = APIRouter()


@router.get("/", response_model=list[NotificationOut])
async def list_notifications(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    unread_only: bool = Query(default=False),
    limit: int = Query(default=50, le=100),
) -> list:
    return await notification_service.get_user_notifications(current_user.id, db, unread_only=unread_only, limit=limit)


@router.post("/mark-read")
async def mark_read(
    body: MarkReadRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    count = await notification_service.mark_read(body.notification_ids, current_user.id, db)
    return {"marked": count}

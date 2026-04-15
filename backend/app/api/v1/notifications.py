from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.notification import NotificationOut, MarkReadRequest
from app.services import notification_service

router = APIRouter()


@router.get("/", response_model=list[NotificationOut])
async def list_notifications(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    # Accept both ?unread=true (frontend) and ?unread_only=true (API consumers)
    unread: bool = Query(default=False),
    unread_only: bool = Query(default=False),
    limit: int = Query(default=50, le=100),
) -> list:
    return await notification_service.get_user_notifications(
        current_user.id, db,
        unread_only=unread or unread_only,
        limit=limit,
    )


@router.patch("/{notification_id}/read", response_model=NotificationOut)
async def mark_one_read(
    notification_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    """Mark a single notification as read (used by frontend NotificationBell)."""
    from sqlalchemy import select
    from app.models.notification import Notification
    from datetime import datetime, timezone
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    notif = result.scalar_one_or_none()
    if notif and not notif.read_at:
        notif.read_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(notif)
    return notif


@router.post("/mark-read")
async def mark_read(
    body: MarkReadRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    count = await notification_service.mark_read(body.notification_ids, current_user.id, db)
    return {"marked": count}

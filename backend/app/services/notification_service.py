import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.models.notification import Notification
from app.schemas.notification import NotificationCreate


async def create_notification(data: NotificationCreate, db: AsyncSession) -> Notification:
    notif = Notification(**data.model_dump())
    db.add(notif)
    await db.commit()
    await db.refresh(notif)
    return notif


async def get_user_notifications(
    user_id: uuid.UUID, db: AsyncSession, unread_only: bool = False, limit: int = 50
) -> list[Notification]:
    q = select(Notification).where(Notification.user_id == user_id).order_by(Notification.created_at.desc()).limit(limit)
    if unread_only:
        q = q.where(Notification.read_at.is_(None))
    result = await db.execute(q)
    return list(result.scalars().all())


async def mark_read(notification_ids: list[int], user_id: uuid.UUID, db: AsyncSession) -> int:
    result = await db.execute(
        update(Notification)
        .where(Notification.id.in_(notification_ids), Notification.user_id == user_id)
        .values(read_at=datetime.now(timezone.utc))
    )
    await db.commit()
    return result.rowcount


async def get_unread_count(user_id: uuid.UUID, db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count())  # type: ignore[name-defined]
        .select_from(Notification)
        .where(Notification.user_id == user_id, Notification.read_at.is_(None))
    )
    return result.scalar() or 0

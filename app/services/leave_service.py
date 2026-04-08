import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.leave import Leave
from app.schemas.leave import LeaveCreate, LeaveUpdate
from app.services.visibility import get_subordinate_ids


async def list_leaves(user: "User", db: AsyncSession, skip: int = 0, limit: int = 100) -> list[Leave]:  # type: ignore[name-defined]
    sub_ids = await get_subordinate_ids(user.id, db)
    result = await db.execute(select(Leave).offset(skip).limit(limit))
    leaves = list(result.scalars().all())

    if user.role == "OWNER":
        return leaves
    visible_ids = {user.id, *sub_ids}
    return [lv for lv in leaves if lv.user_id in visible_ids]


async def create_leave(data: LeaveCreate, user_id: uuid.UUID, db: AsyncSession) -> Leave:
    leave = Leave(**data.model_dump(), user_id=user_id)
    db.add(leave)
    await db.commit()
    await db.refresh(leave)
    return leave


async def update_leave_status(
    leave_id: int, data: LeaveUpdate, approver_id: uuid.UUID, db: AsyncSession
) -> Leave | None:
    result = await db.execute(select(Leave).where(Leave.id == leave_id))
    leave = result.scalar_one_or_none()
    if not leave:
        return None
    if data.status:
        leave.status = data.status
        leave.approved_by = approver_id
    await db.commit()
    await db.refresh(leave)
    return leave

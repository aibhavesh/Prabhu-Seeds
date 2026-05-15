import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.leave import Leave
from app.schemas.leave import LeaveCreate, LeaveUpdate, VALID_LEAVE_TYPES
from app.services.visibility import get_subordinate_ids


async def list_leaves(
    user: "User",  # type: ignore[name-defined]
    db: AsyncSession,
    skip: int = 0,
    limit: int = 200,
    scope: str | None = None,
) -> list[Leave]:
    result = await db.execute(select(Leave).offset(skip).limit(limit))
    leaves = list(result.scalars().all())

    # scope=self → only the calling user's own leaves (regardless of role)
    if scope == "self":
        return [lv for lv in leaves if lv.user_id == user.id]

    sub_ids = await get_subordinate_ids(user.id, db)

    # OWNER sees all; everyone else sees self + subordinates
    if user.role == "OWNER":
        return leaves
    visible_ids = {user.id, *sub_ids}
    return [lv for lv in leaves if lv.user_id in visible_ids]


async def create_leave(data: LeaveCreate, user_id: uuid.UUID, db: AsyncSession) -> Leave:
    leave_type = data.type.lower().strip()
    if leave_type not in VALID_LEAVE_TYPES:
        raise ValueError(f"Invalid leave type '{data.type}'. Must be one of: {sorted(VALID_LEAVE_TYPES)}")
    if data.to_date < data.from_date:
        raise ValueError("to_date must be on or after from_date")

    leave = Leave(**{**data.model_dump(), "type": leave_type}, user_id=user_id)
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

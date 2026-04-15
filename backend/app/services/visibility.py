import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User


async def get_subordinate_ids(user_id: uuid.UUID, db: AsyncSession) -> list[uuid.UUID]:
    """Recursively fetch all subordinate user IDs for a given manager."""
    result = await db.execute(select(User.id, User.manager_id))
    all_users = result.all()  # list of (id, manager_id)

    id_to_manager: dict[uuid.UUID, uuid.UUID | None] = {row.id: row.manager_id for row in all_users}

    def _collect(uid: uuid.UUID) -> list[uuid.UUID]:
        directs = [kid for kid, mgr in id_to_manager.items() if mgr == uid]
        result_ids = list(directs)
        for d in directs:
            result_ids.extend(_collect(d))
        return result_ids

    return _collect(user_id)


def can_see_dealer(
    dealer_added_by: uuid.UUID | None,
    dealer_assigned_user_ids: list[uuid.UUID],
    user_id: uuid.UUID,
    role: str,
    sub_ids: list[uuid.UUID],
) -> bool:
    if role == "OWNER":
        return True
    if dealer_added_by == user_id:
        return True
    if user_id in dealer_assigned_user_ids:
        return True
    if any(sid in dealer_assigned_user_ids for sid in sub_ids):
        return True
    if dealer_added_by in sub_ids:
        return True
    return False


def can_see_task(
    task_created_by: uuid.UUID | None,
    task_assigned_to: uuid.UUID | None,
    user_id: uuid.UUID,
    role: str,
    sub_ids: list[uuid.UUID],
) -> bool:
    if role == "OWNER":
        return True
    if task_assigned_to == user_id or task_created_by == user_id:
        return True
    if task_assigned_to in sub_ids or task_created_by in sub_ids:
        return True
    return False


def can_see_order(
    order_created_by: uuid.UUID | None,
    dealer_added_by: uuid.UUID | None,
    dealer_assigned_user_ids: list[uuid.UUID],
    user_id: uuid.UUID,
    role: str,
    sub_ids: list[uuid.UUID],
) -> bool:
    """Order visibility is scoped by dealer visibility."""
    return can_see_dealer(dealer_added_by, dealer_assigned_user_ids, user_id, role, sub_ids)

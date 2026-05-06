import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserOut
from app.services import user_service

router = APIRouter()


@router.get("/field-workload", response_model=list[dict])
async def field_users_workload(
    _: Annotated[User, Depends(require_roles("OWNER", "MANAGER"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list:
    """
    Returns all active FIELD users with their current active task count.
    Used by the task creation form to show workload status per agent.
    """
    from sqlalchemy import func, case
    from app.models.task import Task, TaskMember
    from app.schemas.user import UserOut

    # Count active (non-completed, non-cancelled) tasks per user
    # via direct assignment OR group membership
    singular_counts = (
        select(Task.assigned_to.label("user_id"), func.count().label("cnt"))
        .where(Task.assigned_to.is_not(None), Task.status.not_in(["completed", "cancelled"]))
        .group_by(Task.assigned_to)
        .subquery()
    )
    group_counts = (
        select(TaskMember.user_id.label("user_id"), func.count().label("cnt"))
        .join(Task, Task.id == TaskMember.task_id)
        .where(Task.status.not_in(["completed", "cancelled"]))
        .group_by(TaskMember.user_id)
        .subquery()
    )

    result = await db.execute(
        select(User).where(User.role == "FIELD", User.is_active.is_(True)).order_by(User.name)
    )
    users = result.scalars().all()

    # Fetch counts in bulk
    sc_result = await db.execute(select(singular_counts))
    sc_map = {str(row.user_id): row.cnt for row in sc_result.fetchall()}

    gc_result = await db.execute(select(group_counts))
    gc_map = {str(row.user_id): row.cnt for row in gc_result.fetchall()}

    return [
        {
            "id": str(u.id),
            "name": u.name,
            "mobile": u.mobile,
            "hq": u.hq,
            "state": u.state,
            "active_tasks": sc_map.get(str(u.id), 0) + gc_map.get(str(u.id), 0),
        }
        for u in users
    ]


@router.get("/", response_model=list[UserOut])
async def list_users(
    _: Annotated[User, Depends(require_roles("OWNER", "MANAGER"))],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 100,
    role: str | None = Query(default=None, description="Filter by role, e.g. FIELD, MANAGER"),
) -> list[User]:
    return await user_service.list_users(db, skip=skip, limit=limit, role=role)


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    _: Annotated[User, Depends(require_roles("OWNER"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    return await user_service.create_user(body, db)


@router.get("/{user_id}", response_model=UserOut)
async def get_user(
    user_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    if current_user.role not in ("OWNER", "MANAGER") and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    user = await user_service.get_user(user_id, db)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: uuid.UUID,
    body: UserUpdate,
    _: Annotated[User, Depends(require_roles("OWNER"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    user = await user_service.update_user(user_id, body, db)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserOut
from app.services import user_service

router = APIRouter()


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

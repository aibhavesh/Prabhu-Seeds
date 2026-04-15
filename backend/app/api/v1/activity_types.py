from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User
from app.schemas.activity_type import ActivityTypeCreate, ActivityTypeUpdate, ActivityTypeOut
from app.services import activity_type_service

router = APIRouter()


@router.get("/", response_model=list[ActivityTypeOut])
async def list_activity_types(
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    department: str | None = Query(default=None),
) -> list:
    return await activity_type_service.list_activity_types(db, department=department)


@router.post("/", response_model=ActivityTypeOut, status_code=status.HTTP_201_CREATED)
async def create_activity_type(
    body: ActivityTypeCreate,
    _: Annotated[User, Depends(require_roles("OWNER"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    return await activity_type_service.create_activity_type(body, db)


@router.patch("/{at_id}", response_model=ActivityTypeOut)
async def update_activity_type(
    at_id: int,
    body: ActivityTypeUpdate,
    _: Annotated[User, Depends(require_roles("OWNER"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    at = await activity_type_service.update_activity_type(at_id, body, db)
    if not at:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity type not found")
    return at

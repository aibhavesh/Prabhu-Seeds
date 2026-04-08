import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User
from app.schemas.district import DistrictCreate, DistrictOut, DistrictAssignmentCreate, DistrictAssignmentOut
from app.services import district_service

router = APIRouter()


@router.get("/", response_model=list[DistrictOut])
async def list_districts(
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list:
    return await district_service.list_districts(db)


@router.post("/", response_model=DistrictOut, status_code=status.HTTP_201_CREATED)
async def create_district(
    body: DistrictCreate,
    _: Annotated[User, Depends(require_roles("OWNER"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    return await district_service.create_district(body, db)


@router.post("/assignments", response_model=DistrictAssignmentOut, status_code=status.HTTP_201_CREATED)
async def assign_district(
    body: DistrictAssignmentCreate,
    _: Annotated[User, Depends(require_roles("OWNER", "MANAGER"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    return await district_service.assign_district(body, db)


@router.delete("/assignments/{user_id}/{district_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unassign_district(
    user_id: uuid.UUID,
    district_id: str,
    _: Annotated[User, Depends(require_roles("OWNER", "MANAGER"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    removed = await district_service.unassign_district(user_id, district_id, db)
    if not removed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

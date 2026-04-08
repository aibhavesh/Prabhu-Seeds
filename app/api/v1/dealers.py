import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User
from app.schemas.dealer import DealerCreate, DealerUpdate, DealerOut, DealerAssignmentOut
from app.services import dealer_service

router = APIRouter()


@router.get("/", response_model=list[DealerOut])
async def list_dealers(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 100,
) -> list:
    return await dealer_service.list_dealers(current_user, db, skip=skip, limit=limit)


@router.post("/", response_model=DealerOut, status_code=status.HTTP_201_CREATED)
async def create_dealer(
    body: DealerCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    return await dealer_service.create_dealer(body, current_user.id, db)


@router.patch("/{dealer_id}", response_model=DealerOut)
async def update_dealer(
    dealer_id: int,
    body: DealerUpdate,
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    dealer = await dealer_service.update_dealer(dealer_id, body, db)
    if not dealer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dealer not found")
    return dealer


@router.post("/{dealer_id}/assign", response_model=DealerAssignmentOut, status_code=status.HTTP_201_CREATED)
async def assign_dealer(
    dealer_id: int,
    user_id: uuid.UUID,
    _: Annotated[User, Depends(require_roles("OWNER", "MANAGER"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    return await dealer_service.assign_dealer(dealer_id, user_id, db)


@router.delete("/{dealer_id}/assign/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unassign_dealer(
    dealer_id: int,
    user_id: uuid.UUID,
    _: Annotated[User, Depends(require_roles("OWNER", "MANAGER"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    removed = await dealer_service.unassign_dealer(dealer_id, user_id, db)
    if not removed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.order import OrderCreate, OrderUpdate, OrderOut
from app.services import order_service

router = APIRouter()


@router.get("/", response_model=list[OrderOut])
async def list_orders(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 100,
) -> list:
    return await order_service.list_orders(current_user, db, skip=skip, limit=limit)


@router.post("/", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def create_order(
    body: OrderCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    return await order_service.create_order(body, current_user.id, db)


@router.patch("/{order_id}", response_model=OrderOut)
async def update_order(
    order_id: str,
    body: OrderUpdate,
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    try:
        order = await order_service.update_order(order_id, body, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order

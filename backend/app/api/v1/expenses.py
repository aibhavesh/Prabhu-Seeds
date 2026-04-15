from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseOut
from app.services import expense_service

router = APIRouter()


@router.get("/", response_model=list[ExpenseOut])
async def list_expenses(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 100,
) -> list:
    return await expense_service.list_expenses(current_user, db, skip=skip, limit=limit)


@router.post("/", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
async def create_expense(
    body: ExpenseCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    return await expense_service.create_expense(body, current_user.id, db)


@router.patch("/{expense_id}/status", response_model=ExpenseOut)
async def update_expense_status(
    expense_id: int,
    body: ExpenseUpdate,
    current_user: Annotated[User, Depends(require_roles("OWNER", "MANAGER"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    expense = await expense_service.update_expense_status(expense_id, body, current_user.id, db)
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    return expense

"""
Travel reimbursement router — convenience alias over /expenses filtered to type=travel.
Provides the approve/reject workflow expected by Accounts role.
"""
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User
from app.models.expense import Expense
from app.schemas.expense import ExpenseOut
from app.services import expense_service
from app.services.visibility import get_subordinate_ids

router = APIRouter()


@router.get("/", response_model=list[ExpenseOut])
async def list_travel_claims(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    status_filter: str | None = None,
) -> list:
    """List travel expenses scoped by role. Accounts/Owner see all pending."""
    all_expenses = await expense_service.list_expenses(current_user, db)
    travel = [e for e in all_expenses if e.type == "travel"]
    if status_filter:
        travel = [e for e in travel if e.status == status_filter]
    return travel


@router.patch("/{expense_id}/approve", response_model=ExpenseOut)
async def approve_travel(
    expense_id: int,
    current_user: Annotated[User, Depends(require_roles("OWNER", "MANAGER", "ACCOUNTS"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    from app.schemas.expense import ExpenseUpdate
    expense = await expense_service.update_expense_status(expense_id, ExpenseUpdate(status="approved"), current_user.id, db)
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Travel claim not found")
    return expense


@router.patch("/{expense_id}/reject", response_model=ExpenseOut)
async def reject_travel(
    expense_id: int,
    current_user: Annotated[User, Depends(require_roles("OWNER", "MANAGER", "ACCOUNTS"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    from app.schemas.expense import ExpenseUpdate
    expense = await expense_service.update_expense_status(expense_id, ExpenseUpdate(status="rejected"), current_user.id, db)
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Travel claim not found")
    return expense

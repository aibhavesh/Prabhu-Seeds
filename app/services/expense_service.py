import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.expense import Expense
from app.schemas.expense import ExpenseCreate, ExpenseUpdate
from app.services.visibility import get_subordinate_ids


async def list_expenses(user: "User", db: AsyncSession, skip: int = 0, limit: int = 100) -> list[Expense]:  # type: ignore[name-defined]
    sub_ids = await get_subordinate_ids(user.id, db)
    result = await db.execute(select(Expense).offset(skip).limit(limit))
    expenses = list(result.scalars().all())

    if user.role == "OWNER":
        return expenses
    visible_ids = {user.id, *sub_ids}
    return [e for e in expenses if e.user_id in visible_ids]


async def create_expense(data: ExpenseCreate, user_id: uuid.UUID, db: AsyncSession) -> Expense:
    expense = Expense(**data.model_dump(), user_id=user_id)
    db.add(expense)
    await db.commit()
    await db.refresh(expense)
    return expense


async def update_expense_status(
    expense_id: int, data: ExpenseUpdate, approver_id: uuid.UUID, db: AsyncSession
) -> Expense | None:
    result = await db.execute(select(Expense).where(Expense.id == expense_id))
    expense = result.scalar_one_or_none()
    if not expense:
        return None
    if data.status:
        expense.status = data.status
        expense.approved_by = approver_id
    await db.commit()
    await db.refresh(expense)
    return expense

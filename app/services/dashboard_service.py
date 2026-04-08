import uuid
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.order import Order, OrderItem
from app.models.task import Task
from app.models.expense import Expense
from app.models.dealer import Dealer, DealerAssignment
from app.models.user import User
from app.services.visibility import get_subordinate_ids


async def get_dashboard_kpis(user: "User", db: AsyncSession) -> dict:  # type: ignore[name-defined]
    sub_ids = await get_subordinate_ids(user.id, db)

    # My dealers count
    if user.role == "OWNER":
        dealer_count_result = await db.execute(select(func.count()).select_from(Dealer))
    else:
        dealer_count_result = await db.execute(
            select(func.count()).select_from(DealerAssignment).where(
                DealerAssignment.user_id.in_([user.id, *sub_ids])
            )
        )
    dealer_count = dealer_count_result.scalar() or 0

    # Active tasks
    task_query = select(func.count()).select_from(Task).where(Task.status == "running")
    if user.role != "OWNER":
        visible_ids = [user.id, *sub_ids]
        task_query = task_query.where(
            (Task.assigned_to.in_(visible_ids)) | (Task.created_by.in_(visible_ids))
        )
    active_tasks = (await db.execute(task_query)).scalar() or 0

    # Pending expenses (subordinates)
    pending_exp_result = await db.execute(
        select(func.count()).select_from(Expense).where(
            Expense.status == "pending",
            Expense.user_id.in_([user.id, *sub_ids]) if user.role != "OWNER" else True,
        )
    )
    pending_expenses = pending_exp_result.scalar() or 0

    # Team size
    team_size = len(sub_ids)

    return {
        "dealer_count": dealer_count,
        "active_tasks": active_tasks,
        "pending_expenses": pending_expenses,
        "team_size": team_size,
    }

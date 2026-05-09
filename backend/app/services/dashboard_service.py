from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.task import Task
from app.models.expense import Expense
from app.models.dealer import Dealer, DealerAssignment
from app.models.attendance import Attendance
from app.models.user import User
from app.services.visibility import get_subordinate_ids


async def get_dashboard_kpis(user: "User", db: AsyncSession) -> dict:  # type: ignore[name-defined]
    sub_ids = await get_subordinate_ids(user.id, db)
    today = date.today()
    first_of_month = date(today.year, today.month, 1)

    is_owner = user.role == "OWNER"
    visible_ids = [user.id, *sub_ids]

    # ── Dealers ───────────────────────────────────────────────────────────────
    if is_owner:
        dealer_count = (await db.execute(
            select(func.count()).select_from(Dealer)
        )).scalar() or 0
    else:
        dealer_count = (await db.execute(
            select(func.count()).select_from(DealerAssignment)
            .where(DealerAssignment.user_id.in_(visible_ids))
        )).scalar() or 0

    # ── Tasks (role-scoped) ───────────────────────────────────────────────────
    if is_owner:
        task_filter = True
    else:
        task_filter = (
            (Task.assigned_to.in_(visible_ids)) | (Task.created_by.in_(visible_ids))
        )

    total_tasks = (await db.execute(
        select(func.count()).select_from(Task).where(task_filter)
    )).scalar() or 0

    completed_tasks = (await db.execute(
        select(func.count()).select_from(Task).where(task_filter, Task.status == "completed")
    )).scalar() or 0

    active_tasks = (await db.execute(
        select(func.count()).select_from(Task).where(task_filter, Task.status == "running")
    )).scalar() or 0

    completion_pct = round(completed_tasks / total_tasks * 100, 1) if total_tasks > 0 else 0.0

    # ── Travel spend — approved expenses this month ────────────────────────────
    travel_user_filter = (
        True if is_owner else Expense.user_id.in_(visible_ids)
    )

    travel_spend = float((await db.execute(
        select(func.sum(Expense.amount))
        .where(
            Expense.type == "travel",
            Expense.status == "approved",
            Expense.date >= first_of_month,
            travel_user_filter,
        )
    )).scalar() or 0)

    # ── Pending travel approvals ───────────────────────────────────────────────
    pending_approvals = (await db.execute(
        select(func.count()).select_from(Expense)
        .where(
            Expense.type == "travel",
            Expense.status == "pending",
            travel_user_filter,
        )
    )).scalar() or 0

    # ── Pending expenses (all types) ──────────────────────────────────────────
    pending_expenses = (await db.execute(
        select(func.count()).select_from(Expense)
        .where(
            Expense.status == "pending",
            True if is_owner else Expense.user_id.in_(visible_ids),
        )
    )).scalar() or 0

    # ── Team check-ins today ──────────────────────────────────────────────────
    team_size = len(sub_ids)
    checkins_today = 0
    if sub_ids:
        checkins_today = (await db.execute(
            select(func.count()).select_from(Attendance)
            .where(
                Attendance.user_id.in_(sub_ids),
                Attendance.date == today,
                Attendance.check_in.isnot(None),
            )
        )).scalar() or 0

    return {
        # Legacy fields (kept for backwards compat)
        "dealer_count": dealer_count,
        "active_tasks": active_tasks,
        "pending_expenses": pending_expenses,
        "team_size": team_size,
        # Richer fields for dashboards
        "total_tasks": total_tasks,
        "completion_pct": completion_pct,
        "travel_spend": travel_spend,
        "pending_approvals": pending_approvals,
        "checkins_today": checkins_today,
    }

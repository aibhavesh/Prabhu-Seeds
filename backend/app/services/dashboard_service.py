from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast
from sqlalchemy.types import Date as DateType

from app.models.task import Task
from app.models.expense import Expense
from app.models.dealer import Dealer, DealerAssignment
from app.models.attendance import Attendance
from app.models.user import User
from app.services.visibility import get_subordinate_ids


async def get_dashboard_kpis(
    user: "User",  # type: ignore[name-defined]
    db: AsyncSession,
    from_date: date | None = None,
    to_date: date | None = None,
) -> dict:
    today = date.today()
    effective_from = from_date or date(today.year, today.month, 1)
    effective_to   = to_date   or today

    sub_ids     = await get_subordinate_ids(user.id, db)
    is_owner    = user.role == "OWNER"
    visible_ids = [user.id, *sub_ids]

    # Dealers (snapshot, not date-scoped)
    if is_owner:
        dealer_count = (await db.execute(
            select(func.count()).select_from(Dealer)
        )).scalar() or 0
    else:
        dealer_count = (await db.execute(
            select(func.count()).select_from(DealerAssignment)
            .where(DealerAssignment.user_id.in_(visible_ids))
        )).scalar() or 0

    # Tasks within the period
    task_date = cast(Task.created_at, DateType())
    if is_owner:
        task_scope = (task_date >= effective_from) & (task_date <= effective_to)
    else:
        task_scope = (
            ((Task.assigned_to.in_(visible_ids)) | (Task.created_by.in_(visible_ids)))
            & (task_date >= effective_from)
            & (task_date <= effective_to)
        )

    total_tasks = (await db.execute(
        select(func.count()).select_from(Task).where(task_scope)
    )).scalar() or 0

    completed_tasks = (await db.execute(
        select(func.count()).select_from(Task)
        .where(task_scope, Task.status == "completed")
    )).scalar() or 0

    active_tasks = (await db.execute(
        select(func.count()).select_from(Task)
        .where(task_scope, Task.status == "running")
    )).scalar() or 0

    completion_pct = round(completed_tasks / total_tasks * 100, 1) if total_tasks > 0 else 0.0

    # Travel expenses within the period
    exp_scope = (Expense.date >= effective_from) & (Expense.date <= effective_to)
    if not is_owner:
        exp_scope = exp_scope & Expense.user_id.in_(visible_ids)

    travel_spend = float((await db.execute(
        select(func.sum(Expense.amount))
        .where(exp_scope, Expense.type == "travel", Expense.status == "approved")
    )).scalar() or 0)

    pending_approvals = (await db.execute(
        select(func.count()).select_from(Expense)
        .where(exp_scope, Expense.type == "travel", Expense.status == "pending")
    )).scalar() or 0

    pending_expenses = (await db.execute(
        select(func.count()).select_from(Expense)
        .where(exp_scope, Expense.status == "pending")
    )).scalar() or 0

    # Attendance within the period
    team_size = len(sub_ids)
    avg_attendance_pct = 0.0

    if sub_ids:
        att_present = (await db.execute(
            select(func.count()).select_from(Attendance)
            .where(
                Attendance.user_id.in_(sub_ids),
                Attendance.date >= effective_from,
                Attendance.date <= effective_to,
                Attendance.check_in.isnot(None),
            )
        )).scalar() or 0

        days_in_period     = (effective_to - effective_from).days + 1
        total_possible     = team_size * days_in_period
        avg_attendance_pct = round(att_present / total_possible * 100, 1) if total_possible > 0 else 0.0

    # Today's check-ins (always current, not range-scoped)
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
        "dealer_count":       dealer_count,
        "active_tasks":       active_tasks,
        "pending_expenses":   pending_expenses,
        "team_size":          team_size,
        "total_tasks":        total_tasks,
        "completion_pct":     completion_pct,
        "avg_attendance_pct": avg_attendance_pct,
        "travel_spend":       travel_spend,
        "pending_approvals":  pending_approvals,
        "checkins_today":     checkins_today,
    }

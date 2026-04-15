from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract
from datetime import date

from app.models.task import Task
from app.models.attendance import Attendance
from app.models.expense import Expense
from app.models.user import User
from app.services.visibility import get_subordinate_ids


async def get_full_analytics(user: "User", db: AsyncSession, month: date | None = None) -> dict:  # type: ignore[name-defined]
    sub_ids = await get_subordinate_ids(user.id, db)
    visible_user_ids = [user.id, *sub_ids] if user.role != "OWNER" else None

    today = date.today()
    yr = month.year if month else today.year
    mo = month.month if month else today.month

    # --- KPIs ---
    # Total tasks this month
    task_q = select(func.count()).select_from(Task).where(
        extract("month", Task.created_at) == mo,
        extract("year", Task.created_at) == yr,
    )
    if visible_user_ids:
        task_q = task_q.where(Task.assigned_to.in_(visible_user_ids))
    total_tasks = (await db.execute(task_q)).scalar() or 0

    # Completed tasks
    comp_q = task_q.where(Task.status == "completed")
    completed_tasks = (await db.execute(comp_q)).scalar() or 0
    completion_rate = round((completed_tasks / total_tasks * 100) if total_tasks else 0, 1)

    # Avg attendance this month
    att_q = select(func.count(Attendance.id.distinct())).where(
        extract("month", Attendance.date) == mo,
        extract("year", Attendance.date) == yr,
    )
    if visible_user_ids:
        att_q = att_q.where(Attendance.user_id.in_(visible_user_ids))
    att_count = (await db.execute(att_q)).scalar() or 0

    # Total travel expenses this month
    exp_q = select(func.sum(Expense.amount)).where(
        Expense.type == "travel",
        Expense.status == "approved",
        extract("month", Expense.date) == mo,
        extract("year", Expense.date) == yr,
    )
    if visible_user_ids:
        exp_q = exp_q.where(Expense.user_id.in_(visible_user_ids))
    travel_spend = (await db.execute(exp_q)).scalar() or Decimal("0")

    # Active staff (checked in today)
    active_q = select(func.count()).select_from(Attendance).where(Attendance.date == today, Attendance.status == "active")
    if visible_user_ids:
        active_q = active_q.where(Attendance.user_id.in_(visible_user_ids))
    active_staff = (await db.execute(active_q)).scalar() or 0

    # Pending approvals (expenses + leaves)
    pend_q = select(func.count()).select_from(Expense).where(Expense.status == "pending")
    if visible_user_ids:
        pend_q = pend_q.where(Expense.user_id.in_(visible_user_ids))
    pending_approvals = (await db.execute(pend_q)).scalar() or 0

    kpis = [
        {"label": "Total Tasks", "value": total_tasks, "unit": None},
        {"label": "Completion Rate", "value": completion_rate, "unit": "%"},
        {"label": "Attendance Days", "value": att_count, "unit": "days"},
        {"label": "Travel Spend", "value": float(travel_spend), "unit": "INR"},
        {"label": "Active Staff", "value": active_staff, "unit": None},
        {"label": "Pending Approvals", "value": pending_approvals, "unit": None},
    ]

    # --- By Department ---
    dept_rows = (await db.execute(
        select(Task.dept, func.count().label("total"),
               func.sum((Task.status == "completed").cast(db.bind.dialect.name == "postgresql" and "int" or "integer")).label("completed"))  # type: ignore
        .group_by(Task.dept)
    )).all()

    # Simpler department query
    depts_result = await db.execute(
        select(Task.dept, func.count().label("total")).group_by(Task.dept)
    )
    completed_result = await db.execute(
        select(Task.dept, func.count().label("cnt")).where(Task.status == "completed").group_by(Task.dept)
    )
    dept_total_map = {row.dept: row.total for row in depts_result if row.dept}
    dept_comp_map = {row.dept: row.cnt for row in completed_result if row.dept}

    by_department = []
    for dept, total in dept_total_map.items():
        comp = dept_comp_map.get(dept, 0)
        by_department.append({
            "department": dept,
            "total_tasks": total,
            "completed_tasks": comp,
            "completion_rate": round(comp / total * 100 if total else 0, 1),
        })

    # --- By State ---
    state_result = await db.execute(
        select(User.state, func.count(User.id.distinct()).label("staff_count"))
        .group_by(User.state)
        .where(User.is_active == True)  # noqa: E712
    )
    by_state = [
        {"state": row.state or "Unknown", "active_staff": row.staff_count, "total_tasks": 0, "completed_tasks": 0, "completion_rate": 0.0}
        for row in state_result
    ]

    # --- Top performers ---
    team_result = await db.execute(
        select(User.id, User.name,
               func.count(Task.id.distinct()).label("total_tasks"))
        .outerjoin(Task, Task.assigned_to == User.id)
        .where(User.is_active == True)  # noqa: E712
        .group_by(User.id, User.name)
        .order_by(func.count(Task.id.distinct()).desc())
        .limit(10)
    )
    top_performers = [
        {"user_id": str(row.id), "name": row.name, "total_tasks": row.total_tasks,
         "completed_tasks": 0, "attendance_days": 0, "travel_km": 0.0}
        for row in team_result
    ]

    return {
        "kpis": kpis,
        "by_department": by_department,
        "by_state": by_state,
        "top_performers": top_performers,
    }

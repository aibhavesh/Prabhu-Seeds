import uuid
import csv
import io
from datetime import date as date_type, datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete, and_
from sqlalchemy.orm import joinedload

from app.models.task import Task, TaskRecord, TaskMember
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate, TaskRecordCreate, TaskOut, TaskMeta, TaskListResponse
from app.services.visibility import get_subordinate_ids, can_see_task


async def _enrich(task: Task, db: AsyncSession) -> TaskOut:
    """Build a TaskOut with record_count, assigned_to_name, and group members populated."""
    rec_count = await db.scalar(
        select(func.count()).select_from(TaskRecord).where(TaskRecord.task_id == task.id)
    ) or 0

    # Group task members
    member_rows = (await db.execute(
        select(TaskMember).where(TaskMember.task_id == task.id)
    )).scalars().all()
    member_ids = [m.user_id for m in member_rows]
    member_names: list[str] = []
    if member_ids:
        users = (await db.execute(
            select(User).where(User.id.in_(member_ids))
        )).scalars().all()
        member_names = [u.name for u in users]

    out = TaskOut.model_validate(task)
    updates: dict = {"record_count": rec_count, "members": member_ids, "member_names": member_names}
    if task.assignee:
        updates["assigned_to_name"] = task.assignee.name
    return out.model_copy(update=updates)


async def list_tasks(
    user: "User",  # type: ignore[name-defined]
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    status: str | None = None,
    dept: str | None = None,
    search: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list[Task]:
    conditions = []
    if status:
        conditions.append(Task.status == status)
    if dept:
        conditions.append(Task.dept == dept)
    if search:
        conditions.append(Task.title.ilike(f"%{search}%"))
    if date_from:
        try:
            conditions.append(Task.deadline >= datetime.strptime(date_from, "%Y-%m-%d").date())
        except ValueError:
            pass
    if date_to:
        try:
            conditions.append(Task.deadline <= datetime.strptime(date_to, "%Y-%m-%d").date())
        except ValueError:
            pass

    query = select(Task).options(joinedload(Task.assignee))
    if conditions:
        query = query.where(and_(*conditions))
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    tasks = list(result.scalars().all())

    if user.role == "OWNER":
        return tasks

    sub_ids = await get_subordinate_ids(user.id, db)

    # Group tasks the user is a member of (not necessarily assigned_to)
    member_rows = await db.execute(
        select(TaskMember.task_id).where(TaskMember.user_id == user.id)
    )
    member_task_ids = {row[0] for row in member_rows}

    return [
        t for t in tasks
        if can_see_task(t.created_by, t.assigned_to, user.id, user.role, sub_ids)
        or t.id in member_task_ids
    ]


async def list_tasks_with_meta(
    user: "User",  # type: ignore[name-defined]
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    status: str | None = None,
    dept: str | None = None,
    search: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> TaskListResponse:
    tasks = await list_tasks(
        user, db,
        skip=skip, limit=limit,
        status=status, dept=dept,
        search=search, date_from=date_from, date_to=date_to,
    )
    task_outs = [await _enrich(t, db) for t in tasks]

    total = len(task_outs)
    pending = sum(1 for t in task_outs if t.status == "assigned")
    active = sum(1 for t in task_outs if t.status == "running")
    completed = sum(1 for t in task_outs if t.status == "completed")
    efficiency = round(completed / total * 100) if total > 0 else 0

    return TaskListResponse(
        tasks=task_outs,
        meta=TaskMeta(total=total, pending=pending, active=active, efficiency=efficiency),
    )


async def create_task(data: TaskCreate, created_by: uuid.UUID, db: AsyncSession) -> Task:
    task_data = data.model_dump(exclude={"members"})
    task = Task(**task_data, created_by=created_by)
    db.add(task)
    await db.flush()  # get task.id before inserting members

    if data.assignment_type == "group" and data.members:
        for uid in data.members:
            db.add(TaskMember(task_id=task.id, user_id=uid))

    await db.commit()
    await db.refresh(task)
    return task


async def update_task(task_id: int, data: TaskUpdate, db: AsyncSession) -> Task | None:
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        return None

    if data.status:
        task.status = data.status
        if data.status == "running" and not task.started_at:
            task.started_at = date_type.today()

    for field in ("title", "target", "deadline", "repeat_count", "assigned_to", "dept", "activity_type", "description", "assignment_type"):
        val = getattr(data, field, None)
        if val is not None:
            setattr(task, field, val)

    # Replace group members if provided
    if data.members is not None:
        await db.execute(delete(TaskMember).where(TaskMember.task_id == task_id))
        for uid in data.members:
            db.add(TaskMember(task_id=task_id, user_id=uid))

    await db.commit()
    await db.refresh(task)
    return task


async def submit_record(task_id: int, data: TaskRecordCreate, submitted_by: uuid.UUID, db: AsyncSession) -> TaskRecord:
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise ValueError("Task not found")
    if task.status == "completed":
        raise ValueError("Cannot submit records for a completed task")

    record = TaskRecord(task_id=task_id, submitted_by=submitted_by, **data.model_dump())
    db.add(record)
    await db.flush()

    # Auto-complete the task when all repetitions are done
    rec_count = await db.scalar(
        select(func.count()).select_from(TaskRecord).where(TaskRecord.task_id == task_id)
    ) or 0
    if rec_count >= task.repeat_count:
        task.status = "completed"

    await db.commit()
    await db.refresh(record)
    return record


async def get_task_records(task_id: int, db: AsyncSession) -> list[TaskRecord]:
    result = await db.execute(
        select(TaskRecord).where(TaskRecord.task_id == task_id).order_by(TaskRecord.submitted_at)
    )
    return list(result.scalars().all())


async def delete_task(task_id: int, db: AsyncSession) -> bool:
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        return False
    await db.delete(task)
    await db.commit()
    return True


async def export_tasks_csv(user: "User", db: AsyncSession) -> str:  # type: ignore[name-defined]
    tasks = await list_tasks(user, db, skip=0, limit=10000)

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "id", "title", "dept", "activity_type", "assigned_to", "district_id",
        "status", "target", "unit", "repeat_count", "deadline", "created_at", "record_count"
    ])
    writer.writeheader()

    for task in tasks:
        rec_count = await db.scalar(
            select(func.count()).select_from(TaskRecord).where(TaskRecord.task_id == task.id)
        ) or 0
        writer.writerow({
            "id": task.id,
            "title": task.title,
            "dept": task.dept,
            "activity_type": task.activity_type,
            "assigned_to": str(task.assigned_to) if task.assigned_to else "",
            "district_id": task.district_id,
            "status": task.status,
            "target": task.target,
            "unit": task.unit,
            "repeat_count": task.repeat_count,
            "deadline": str(task.deadline) if task.deadline else "",
            "created_at": str(task.created_at),
            "record_count": rec_count,
        })

    return output.getvalue()

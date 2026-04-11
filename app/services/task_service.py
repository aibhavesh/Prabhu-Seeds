import uuid
import csv
import io
from datetime import date as date_type
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload

from app.models.task import Task, TaskRecord
from app.schemas.task import TaskCreate, TaskUpdate, TaskRecordCreate, TaskOut, TaskMeta, TaskListResponse
from app.services.visibility import get_subordinate_ids, can_see_task


async def list_tasks(user: "User", db: AsyncSession, skip: int = 0, limit: int = 100) -> list[Task]:  # type: ignore[name-defined]
    sub_ids = await get_subordinate_ids(user.id, db)
    result = await db.execute(
        select(Task).options(joinedload(Task.assignee)).offset(skip).limit(limit)
    )
    tasks = list(result.scalars().all())

    if user.role == "OWNER":
        return tasks
    return [
        t for t in tasks
        if can_see_task(t.created_by, t.assigned_to, user.id, user.role, sub_ids)
    ]


async def list_tasks_with_meta(user: "User", db: AsyncSession, skip: int = 0, limit: int = 100) -> TaskListResponse:  # type: ignore[name-defined]
    tasks = await list_tasks(user, db, skip=skip, limit=limit)

    task_outs = []
    for t in tasks:
        out = TaskOut.model_validate(t)
        if t.assignee:
            out = out.model_copy(update={"assigned_to_name": t.assignee.name})
        task_outs.append(out)

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
    task = Task(**data.model_dump(), created_by=created_by)
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


async def update_task(task_id: int, data: TaskUpdate, db: AsyncSession) -> Task | None:
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        return None

    STATUS_FLOW = {"assigned": 1, "running": 2, "hold": 3, "completed": 4}
    if data.status:
        task.status = data.status
        if data.status == "running" and not task.started_at:
            task.started_at = date_type.today()

    for field in ("title", "target", "deadline"):
        val = getattr(data, field, None)
        if val is not None:
            setattr(task, field, val)

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
    await db.commit()
    await db.refresh(record)
    return record


async def export_tasks_csv(user: "User", db: AsyncSession) -> str:  # type: ignore[name-defined]
    tasks = await list_tasks(user, db, skip=0, limit=10000)

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "id", "title", "dept", "activity_type", "assigned_to", "district_id",
        "status", "target", "unit", "deadline", "created_at", "record_count"
    ])
    writer.writeheader()

    for task in tasks:
        record_result = await db.execute(
            select(func.count()).select_from(TaskRecord).where(TaskRecord.task_id == task.id)
        )
        rec_count = record_result.scalar() or 0
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
            "deadline": str(task.deadline) if task.deadline else "",
            "created_at": str(task.created_at),
            "record_count": rec_count,
        })

    return output.getvalue()

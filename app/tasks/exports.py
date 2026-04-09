import io
import csv
from app.worker import celery_app


@celery_app.task(bind=True, name="tasks.export_tasks_csv")
def export_tasks_csv_task(self, user_id: str, role: str) -> str:
    """
    Background task: generate tasks CSV for a given user/role.
    Returns the CSV string as the task result (stored in Redis backend).
    For large datasets, consider writing to S3/Supabase Storage instead.
    """
    import asyncio
    from sqlalchemy.ext.asyncio import AsyncSession
    from app.core.database import AsyncSessionLocal
    from app.services.task_service import export_tasks_csv
    from app.models.user import User
    from sqlalchemy import select
    import uuid

    async def _run() -> str:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
            user = result.scalar_one_or_none()
            if not user:
                return ""
            return await export_tasks_csv(user, db)

    return asyncio.run(_run())


@celery_app.task(bind=True, name="tasks.export_attendance_csv")
def export_attendance_csv_task(self, user_id: str, role: str, month: str) -> str:
    """Background task: generate attendance CSV for a month (YYYY-MM)."""
    import asyncio
    from sqlalchemy.ext.asyncio import AsyncSession
    from app.core.database import AsyncSessionLocal
    from app.models.attendance import Attendance
    from app.models.user import User
    from sqlalchemy import select, extract
    import uuid

    async def _run() -> str:
        async with AsyncSessionLocal() as db:
            year, mon = map(int, month.split("-"))
            stmt = (
                select(Attendance)
                .where(
                    extract("year", Attendance.date) == year,
                    extract("month", Attendance.date) == mon,
                )
            )
            if role not in ("OWNER",):
                stmt = stmt.where(Attendance.user_id == uuid.UUID(user_id))
            rows = (await db.execute(stmt)).scalars().all()

            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=["id", "user_id", "date", "check_in", "check_out", "km", "status"])
            writer.writeheader()
            for r in rows:
                writer.writerow({
                    "id": r.id, "user_id": str(r.user_id), "date": str(r.date),
                    "check_in": str(r.check_in), "check_out": str(r.check_out),
                    "km": str(r.km), "status": r.status,
                })
            return output.getvalue()

    return asyncio.run(_run())

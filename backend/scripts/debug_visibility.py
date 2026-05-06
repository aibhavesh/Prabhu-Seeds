import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, text
from sqlalchemy.orm import joinedload

DATABASE_URL = 'postgresql+asyncpg://postgres.cukerxoagdwzathdpfny:1175955901%40Hk@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'

async def main():
    engine = create_async_engine(DATABASE_URL)
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as db:
        from app.models.task import Task, TaskMember
        from app.models.user import User
        from app.services.visibility import can_see_task, get_subordinate_ids

        # Get FA3
        r = await db.execute(select(User).where(User.name == 'Field Agent 3'))
        fa3 = r.scalar_one()
        print(f"FA3: id={fa3.id} role={fa3.role}")

        # Get task 21
        r2 = await db.execute(select(Task).options(joinedload(Task.assignee)).where(Task.id == 21))
        task = r2.scalar_one_or_none()
        if task:
            print(f"Task 21: assigned_to={task.assigned_to} created_by={task.created_by}")
            print(f"  assigned_to == fa3.id: {task.assigned_to == fa3.id}")
            print(f"  type(assigned_to)={type(task.assigned_to)} type(fa3.id)={type(fa3.id)}")

            sub_ids = await get_subordinate_ids(fa3.id, db)
            print(f"  FA3 sub_ids: {sub_ids}")

            result = can_see_task(task.created_by, task.assigned_to, fa3.id, fa3.role, sub_ids)
            print(f"  can_see_task result: {result}")

            # Check member
            member_row = await db.execute(
                select(TaskMember.task_id).where(
                    TaskMember.task_id == 21,
                    TaskMember.user_id.in_([fa3.id] + list(sub_ids))
                )
            )
            is_member = member_row.first() is not None
            print(f"  is_member: {is_member}")

            print(f"  FINAL: visible = {result or is_member}")
        else:
            print("Task 21 not found!")

        # Also check list_tasks for FA3
        print()
        print("=== list_tasks simulation for FA3 ===")
        from app.services.task_service import list_tasks
        tasks = await list_tasks(fa3, db, limit=100)
        print(f"  Tasks visible to FA3: {[t.id for t in tasks]}")

    await engine.dispose()

asyncio.run(main())

import asyncio, sys
sys.path.insert(0, '.')
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

DATABASE_URL = 'postgresql+asyncpg://postgres.cukerxoagdwzathdpfny:1175955901%40Hk@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'

async def main():
    engine = create_async_engine(DATABASE_URL)
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as db:
        from app.models.user import User
        from app.services.task_service import list_tasks, get_task_by_id

        for name in ['Owner 1', 'Manager 1', 'Field Agent 3']:
            r = await db.execute(select(User).where(User.name == name))
            u = r.scalar_one()
            tasks = await list_tasks(u, db, limit=100)
            t21 = await get_task_by_id(21, u, db)
            found = "FOUND" if t21 else "NOT FOUND"
            print(f"{name} ({u.role}): list={[t.id for t in tasks]}  get_by_id(21)={found}")

    await engine.dispose()

asyncio.run(main())

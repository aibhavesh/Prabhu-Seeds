import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text

DATABASE_URL = 'postgresql+asyncpg://postgres.cukerxoagdwzathdpfny:1175955901%40Hk@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'

async def main():
    engine = create_async_engine(DATABASE_URL)
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as db:
        print('=== TABLES ===')
        r = await db.execute(text(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
        ))
        for row in r.fetchall():
            print(' ', row[0])

        print('\n=== DISTINCT activity_type in tasks ===')
        r = await db.execute(text('SELECT DISTINCT activity_type FROM tasks WHERE activity_type IS NOT NULL ORDER BY activity_type'))
        for row in r.fetchall():
            print(' ', row[0])

        print('\n=== DISTINCT crop in tasks ===')
        r = await db.execute(text('SELECT DISTINCT crop FROM tasks WHERE crop IS NOT NULL ORDER BY crop'))
        for row in r.fetchall():
            print(' ', row[0])

        print('\n=== activity_types table ===')
        try:
            r = await db.execute(text('SELECT * FROM activity_types LIMIT 20'))
            cols = r.keys()
            for row in r.fetchall():
                print(' ', dict(zip(cols, row)))
        except Exception as e:
            print('  Not found:', e)

        print('\n=== products table ===')
        try:
            r = await db.execute(text('SELECT id, name FROM products LIMIT 10'))
            for row in r.fetchall():
                print(' ', row[0], row[1])
        except Exception as e:
            print('  Not found:', e)

        print('\n=== FIELD users with task counts ===')
        r = await db.execute(text("""
            SELECT u.id, u.name, u.mobile,
                   COUNT(CASE WHEN t.status NOT IN ('completed','cancelled') THEN 1 END) as active_tasks
            FROM users u
            LEFT JOIN tasks t ON (t.assigned_to = u.id OR EXISTS (
                SELECT 1 FROM task_members tm WHERE tm.task_id = t.id AND tm.user_id = u.id
            ))
            WHERE u.role = 'FIELD' AND u.is_active = true
            GROUP BY u.id, u.name, u.mobile
            ORDER BY u.name
        """))
        for row in r.fetchall():
            print(f'  {row.name:<20} mobile={row.mobile}  active_tasks={row.active_tasks}')

    await engine.dispose()

asyncio.run(main())

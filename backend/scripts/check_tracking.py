import asyncio, sys
sys.path.insert(0, '.')
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text

DATABASE_URL = 'postgresql+asyncpg://postgres.cukerxoagdwzathdpfny:1175955901%40Hk@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'

async def main():
    engine = create_async_engine(DATABASE_URL)
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as db:
        print('=== ALL USERS with manager_id ===')
        r = await db.execute(text(
            'SELECT id, name, role, manager_id FROM users ORDER BY role, name'
        ))
        for row in r.fetchall():
            mgr = str(row.manager_id)[:8] if row.manager_id else 'NULL'
            print(f'  {row.name:<22} role={row.role:<10} manager_id={mgr}')

        print()
        r = await db.execute(text("SELECT id, name FROM users WHERE name = 'Manager 1'"))
        mgr1 = r.fetchone()
        print(f'Manager 1 id = {mgr1.id}')

        print()
        print('Users whose manager_id = Manager 1:')
        r = await db.execute(text('SELECT name, role FROM users WHERE manager_id = :mid'), {'mid': str(mgr1.id)})
        for row in r.fetchall():
            print(f'  {row.name} ({row.role})')

        print()
        print('=== Tracking /live filter logic ===')
        print('Backend filter: r.user.manager_id == current_user.id')
        print('This means only agents with manager_id set to Manager 1 will appear.')
        print()
        print('=== Today attendance records ===')
        r = await db.execute(text("""
            SELECT a.id, u.name, u.role, u.manager_id,
                   a.check_in, a.check_out,
                   COUNT(w.id) as waypoint_count
            FROM attendance a
            JOIN users u ON u.id = a.user_id
            LEFT JOIN gps_waypoints w ON w.attendance_id = a.id
            WHERE a.date = CURRENT_DATE
            GROUP BY a.id, u.name, u.role, u.manager_id, a.check_in, a.check_out
            ORDER BY u.name
        """))
        rows = r.fetchall()
        if rows:
            for row in rows:
                mgr = str(row.manager_id)[:8] if row.manager_id else 'NULL'
                print(f'  {row.name:<22} role={row.role:<8} mgr={mgr} check_in={row.check_in} waypoints={row.waypoint_count}')
        else:
            print('  No attendance records today')

    await engine.dispose()

asyncio.run(main())

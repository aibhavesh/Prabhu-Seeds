import asyncio, sys
sys.path.insert(0, '.')
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text

DATABASE_URL = 'postgresql+asyncpg://postgres.cukerxoagdwzathdpfny:1175955901%40Hk@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'

async def main():
    engine = create_async_engine(DATABASE_URL)
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as db:
        print('=== All attendance records ===')
        r = await db.execute(text("""
            SELECT a.id, u.name, a.date, a.check_in, a.check_out, a.km, a.status,
                   COUNT(w.id) as waypoints
            FROM attendance a
            JOIN users u ON u.id = a.user_id
            LEFT JOIN gps_waypoints w ON w.attendance_id = a.id
            GROUP BY a.id, u.name, a.date, a.check_in, a.check_out, a.km, a.status
            ORDER BY a.date DESC, u.name
        """))
        for row in r.fetchall():
            print(f"  {row.name:<20} date={row.date} km={row.km} status={row.status} waypoints={row.waypoints}")
            print(f"    check_in={row.check_in}  check_out={row.check_out}")

    await engine.dispose()

asyncio.run(main())

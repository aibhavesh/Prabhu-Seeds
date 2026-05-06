import asyncio, sys
sys.path.insert(0, '.')
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text

DATABASE_URL = 'postgresql+asyncpg://postgres.cukerxoagdwzathdpfny:1175955901%40Hk@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'

async def main():
    engine = create_async_engine(DATABASE_URL)
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as db:
        print('=== Attendance records with waypoint counts ===')
        r = await db.execute(text("""
            SELECT a.id, u.name, a.date, a.km, a.status,
                   COUNT(w.id) as wp_count
            FROM attendance a
            JOIN users u ON u.id = a.user_id
            LEFT JOIN gps_waypoints w ON w.attendance_id = a.id
            GROUP BY a.id, u.name, a.date, a.km, a.status
            ORDER BY a.date DESC, u.name
        """))
        rows = r.fetchall()
        for row in rows:
            print(f'  att_id={row.id} {row.name:<20} date={row.date} km={row.km} waypoints={row.wp_count}')

        print()
        print('=== Waypoints for attendance with most points ===')
        r2 = await db.execute(text("""
            SELECT attendance_id, COUNT(*) as cnt
            FROM gps_waypoints GROUP BY attendance_id ORDER BY cnt DESC LIMIT 1
        """))
        top = r2.fetchone()
        if top:
            print(f'  Best: att_id={top.attendance_id} with {top.cnt} waypoints')
            r3 = await db.execute(text(
                'SELECT id, lat, lng, type, timestamp FROM gps_waypoints WHERE attendance_id=:aid ORDER BY timestamp'
            ), {'aid': top.attendance_id})
            for wp in r3.fetchall():
                print(f'    wp_id={wp.id} lat={float(wp.lat):.6f} lng={float(wp.lng):.6f} type={wp.type}')

    await engine.dispose()

asyncio.run(main())

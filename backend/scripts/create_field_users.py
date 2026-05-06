"""
Creates Field Agent 4 and Field Agent 5 in the database.
Assigned to Manager 1 (same as Field Agents 1-3).
Mobile numbers: 9300000004 and 9300000005
"""
import asyncio, sys
sys.path.insert(0, '.')
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text
import uuid

DATABASE_URL = 'postgresql+asyncpg://postgres.cukerxoagdwzathdpfny:1175955901%40Hk@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'

async def main():
    engine = create_async_engine(DATABASE_URL)
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as db:
        # Get Manager 1's id
        r = await db.execute(text("SELECT id FROM users WHERE name = 'Manager 1'"))
        mgr = r.fetchone()
        if not mgr:
            print("ERROR: Manager 1 not found")
            return
        manager_id = str(mgr.id)
        print(f"Manager 1 id: {manager_id}")

        # Check if users already exist
        r2 = await db.execute(text("SELECT name, mobile FROM users WHERE mobile IN ('9300000004', '9300000005')"))
        existing = r2.fetchall()
        if existing:
            print(f"Already exist: {[(row.name, row.mobile) for row in existing]}")

        new_users = [
            {
                'id': str(uuid.uuid4()),
                'name': 'Field Agent 4',
                'role': 'FIELD',
                'mobile': '9300000004',
                'manager_id': manager_id,
                'is_active': True,
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'Field Agent 5',
                'role': 'FIELD',
                'mobile': '9300000005',
                'manager_id': manager_id,
                'is_active': True,
            },
        ]

        for u in new_users:
            # Skip if mobile already exists
            r_check = await db.execute(text("SELECT id FROM users WHERE mobile = :mobile"), {'mobile': u['mobile']})
            if r_check.fetchone():
                print(f"SKIP: {u['name']} ({u['mobile']}) already exists")
                continue

            await db.execute(text("""
                INSERT INTO users (id, name, role, mobile, manager_id, is_active)
                VALUES (:id, :name, :role, :mobile, :manager_id, :is_active)
            """), u)
            print(f"CREATED: {u['name']} | mobile={u['mobile']} | id={u['id']}")

        await db.commit()

        # Verify
        print()
        print("=== All FIELD users now ===")
        r3 = await db.execute(text(
            "SELECT id, name, mobile, role, manager_id, is_active FROM users WHERE role='FIELD' ORDER BY name"
        ))
        for row in r3.fetchall():
            print(f"  {row.name:<20} mobile={row.mobile}  mgr={str(row.manager_id)[:8] if row.manager_id else 'None'}  active={row.is_active}")

    await engine.dispose()

asyncio.run(main())

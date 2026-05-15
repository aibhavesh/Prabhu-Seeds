"""
Simulates the tracking /live filter logic for both OWNER and MANAGER
to verify all subordinates are returned correctly.
"""
import asyncio, sys
sys.path.insert(0, '.')
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, text

DATABASE_URL = 'postgresql+asyncpg://postgres.cukerxoagdwzathdpfny:1175955901%40Hk@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'

async def main():
    engine = create_async_engine(DATABASE_URL)
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as db:
        from app.models.user import User

        # Get all FIELD users
        r = await db.execute(select(User).where(User.role == 'FIELD', User.is_active == True))
        field_users = r.scalars().all()
        print(f"Total FIELD users: {len(field_users)}")
        for u in field_users:
            print(f"  {u.name}  manager_id={u.manager_id}")

        print()

        # Simulate OWNER filter — sees all
        print("=== OWNER sees ===")
        owner_visible = [u for u in field_users if u.role.upper() in ('FIELD', 'MANAGER')]
        print(f"  {len(owner_visible)} agents: {[u.name for u in owner_visible]}")

        print()

        # Simulate MANAGER filter — OLD (UUID comparison, may fail)
        r2 = await db.execute(select(User).where(User.name == 'Manager 1'))
        mgr = r2.scalar_one()
        print(f"=== MANAGER 1 filter (OLD — direct UUID ==) ===")
        old_visible = [u for u in field_users if u.manager_id == mgr.id]
        print(f"  {len(old_visible)} agents: {[u.name for u in old_visible]}")

        print()

        # Simulate MANAGER filter — NEW (string comparison)
        print(f"=== MANAGER 1 filter (NEW — str(uuid) ==) ===")
        mgr_id_str = str(mgr.id)
        new_visible = [u for u in field_users if str(u.manager_id) == mgr_id_str]
        print(f"  {len(new_visible)} agents: {[u.name for u in new_visible]}")

        print()
        print(f"UUID type of mgr.id: {type(mgr.id)}")
        print(f"UUID type of field_users[0].manager_id: {type(field_users[0].manager_id)}")
        print(f"Direct == comparison: {field_users[0].manager_id == mgr.id}")
        print(f"String == comparison: {str(field_users[0].manager_id) == str(mgr.id)}")

    await engine.dispose()

asyncio.run(main())

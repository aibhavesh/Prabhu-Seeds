import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text

DATABASE_URL = 'postgresql+asyncpg://postgres.cukerxoagdwzathdpfny:1175955901%40Hk@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'

async def main():
    engine = create_async_engine(DATABASE_URL)
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as db:

        print('=== ALL TASKS (full detail) ===')
        r = await db.execute(text("""
            SELECT
                t.id, t.title, t.status, t.assignment_type,
                t.created_by, t.assigned_to,
                uc.name as creator_name,
                ua.name as assignee_name
            FROM tasks t
            LEFT JOIN users uc ON uc.id = t.created_by
            LEFT JOIN users ua ON ua.id = t.assigned_to
            ORDER BY t.id
        """))
        rows = r.fetchall()
        for row in rows:
            print(f"  id={row.id} | '{row.title[:40]}' | status={row.status} | type={row.assignment_type}")
            print(f"         created_by={row.creator_name} | assigned_to={row.assignee_name or 'NULL'}")

        print()
        print('=== TASK MEMBERS (group assignments) ===')
        r = await db.execute(text("""
            SELECT tm.task_id, u.name, u.role
            FROM task_members tm
            JOIN users u ON u.id = tm.user_id
            ORDER BY tm.task_id
        """))
        for row in r.fetchall():
            print(f"  task_id={row.task_id} -> {row.name} ({row.role})")

        print()
        print('=== FIELD AGENT 3 details ===')
        r = await db.execute(text("SELECT id, name, mobile, role, manager_id FROM users WHERE name = 'Field Agent 3'"))
        fa3 = r.fetchone()
        if fa3:
            print(f"  id={fa3.id} | name={fa3.name} | mobile={fa3.mobile} | manager_id={fa3.manager_id}")

            print()
            print('=== Tasks visible to Field Agent 3 ===')
            # singular assigned to FA3
            r2 = await db.execute(text("""
                SELECT t.id, t.title, t.status, t.assignment_type, t.assigned_to
                FROM tasks t
                WHERE t.assigned_to = :uid
            """), {'uid': str(fa3.id)})
            singular = r2.fetchall()
            print(f"  Singular (assigned_to = FA3): {len(singular)}")
            for row in singular:
                print(f"    id={row.id} '{row.title}' status={row.status}")

            # group tasks FA3 is member of
            r3 = await db.execute(text("""
                SELECT t.id, t.title, t.status, t.assignment_type
                FROM tasks t
                JOIN task_members tm ON tm.task_id = t.id
                WHERE tm.user_id = :uid
            """), {'uid': str(fa3.id)})
            group = r3.fetchall()
            print(f"  Group (task_members): {len(group)}")
            for row in group:
                print(f"    id={row.id} '{row.title}' status={row.status}")
        else:
            print("  Field Agent 3 not found!")

        print()
        print('=== OWNER 1 visibility check ===')
        r = await db.execute(text("SELECT id FROM users WHERE name = 'Owner 1'"))
        owner = r.fetchone()
        if owner:
            print(f"  Owner 1 id={owner.id}")
            print("  Owner should see ALL tasks (role=OWNER bypasses all filters)")
            print(f"  Total tasks in DB: {len(rows)}")

        print()
        print('=== MANAGER 1 visibility check ===')
        r = await db.execute(text("SELECT id FROM users WHERE name = 'Manager 1'"))
        mgr = r.fetchone()
        if mgr:
            r2 = await db.execute(text("SELECT id, name FROM users WHERE manager_id = :mid"), {'mid': str(mgr.id)})
            subs = r2.fetchall()
            sub_ids = [str(s.id) for s in subs]
            print(f"  Manager 1 id={mgr.id}")
            print(f"  Subordinates: {[s.name for s in subs]}")

            # Tasks created by manager
            r3 = await db.execute(text("SELECT id, title, status FROM tasks WHERE created_by = :uid"), {'uid': str(mgr.id)})
            created = r3.fetchall()
            print(f"  Tasks created by Manager 1: {[f'id={t.id}' for t in created]}")

            # Tasks assigned to manager's subs
            if sub_ids:
                r4 = await db.execute(text(f"""
                    SELECT DISTINCT t.id, t.title, t.assignment_type
                    FROM tasks t
                    LEFT JOIN task_members tm ON tm.task_id = t.id
                    WHERE t.assigned_to = ANY(:ids) OR tm.user_id = ANY(:ids)
                """), {'ids': sub_ids})
                sub_tasks = r4.fetchall()
                print(f"  Tasks involving Manager 1's subs: {[f'id={t.id}' for t in sub_tasks]}")

        print()
        print('=== TASK RECORDS ===')
        r = await db.execute(text("""
            SELECT tr.id, tr.task_id, u.name as submitted_by, tr.submitted_at
            FROM task_records tr
            LEFT JOIN users u ON u.id = tr.submitted_by
            ORDER BY tr.task_id, tr.submitted_at
        """))
        records = r.fetchall()
        if records:
            for row in records:
                print(f"  record_id={row.id} task_id={row.task_id} by={row.submitted_by} at={row.submitted_at}")
        else:
            print("  No records yet")

    await engine.dispose()

asyncio.run(main())

"""
Dev seed script — run once after `alembic upgrade head`.

Creates:
  - 3 OWNER users   (mobile: 9999999999, 9999999998, 9999999997)
  - 3 MANAGER users (mobile: 9888888888, 9888888887, 9888888886)
  - 3 FIELD users   (mobile: 9777777777, 9777777776, 9777777775)  — report to manager-1
  - 3 ACCOUNTS users(mobile: 9666666666, 9666666665, 9666666664)  — report to manager-1
  - All 54 activity types

Safe to re-run — skips already-created users but always refreshes state/hq.

Usage:
    cd C:/Users/acer/Desktop/Prabhu-Seeds
    venv/Scripts/activate
    python scripts/seed_dev.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import uuid
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select, func

from app.core.config import settings
from app.models.user import User
from app.models.activity_type import ActivityType
from app.services.activity_type_service import SEED_ACTIVITY_TYPES

# ── Desired users ──────────────────────────────────────────────────────────────
# (role, name, mobile, state, hq)
USERS_TO_SEED = [
    ("OWNER",    "Prabhu Owner",        "9999999999", "Maharashtra",    "Mumbai"),
    ("OWNER",    "Owner Two",           "9999999998", "Madhya Pradesh", "Bhopal"),
    ("OWNER",    "Owner Three",         "9999999997", "Chhattisgarh",   "Raipur"),
    ("MANAGER",  "Demo Manager",        "9888888888", "Maharashtra",    "Pune"),
    ("MANAGER",  "Manager Two",         "9888888887", "Madhya Pradesh", "Indore"),
    ("MANAGER",  "Manager Three",       "9888888886", "Chhattisgarh",   "Bilaspur"),
    ("FIELD",    "Field Agent",         "9777777777", "Maharashtra",    "Nashik"),
    ("FIELD",    "Field Agent Two",     "9777777776", "Madhya Pradesh", "Jabalpur"),
    ("FIELD",    "Field Agent Three",   "9777777775", "Chhattisgarh",   "Durg"),
    ("ACCOUNTS", "Accounts Staff",      "9666666666", "Maharashtra",    "Mumbai"),
    ("ACCOUNTS", "Accounts Staff Two",  "9666666665", "Madhya Pradesh", "Bhopal"),
    ("ACCOUNTS", "Accounts Staff Three","9666666664", "Chhattisgarh",   "Raipur"),
]


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as db:
        # ── Users ──────────────────────────────────────────────────────────────
        existing_mobiles = set(
            row[0] for row in (
                await db.execute(select(User.mobile))
            ).all()
        )

        to_add = [u for u in USERS_TO_SEED if u[2] not in existing_mobiles]

        if not to_add:
            print("All 12 users already seeded — skipping user creation.")
        else:
            # First pass: create OWNER + MANAGER so we can get manager-1's id
            owners_managers = [u for u in to_add if u[0] in ("OWNER", "MANAGER")]
            for role, name, mobile, state, hq in owners_managers:
                db.add(User(
                    id=uuid.uuid4(), name=name, mobile=mobile, role=role,
                    state=state, hq=hq, is_active=True,
                ))
            await db.flush()

            # Resolve manager-1 id (first manager by mobile desc = highest number)
            manager_result = await db.execute(
                select(User).where(User.role == "MANAGER").order_by(User.mobile.desc()).limit(1)
            )
            manager1 = manager_result.scalar_one_or_none()

            # Second pass: FIELD + ACCOUNTS reporting to manager-1
            subordinates = [u for u in to_add if u[0] in ("FIELD", "ACCOUNTS")]
            for role, name, mobile, state, hq in subordinates:
                db.add(User(
                    id=uuid.uuid4(), name=name, mobile=mobile, role=role,
                    state=state, hq=hq,
                    manager_id=manager1.id if manager1 else None,
                    is_active=True,
                ))

            await db.commit()
            print(f"Created {len(to_add)} new users:")
            for role, name, mobile, state, hq in to_add:
                print(f"  {role:<10} -> {mobile}  {name}  state={state}  hq={hq}")

        # ── Always refresh state/hq for existing users ─────────────────────────
        # This ensures re-running the script fixes users created before state was added.
        state_map = {u[2]: (u[3], u[4]) for u in USERS_TO_SEED}
        all_users_result = await db.execute(select(User))
        all_users = all_users_result.scalars().all()
        updated = 0
        for user in all_users:
            if user.mobile in state_map:
                new_state, new_hq = state_map[user.mobile]
                if user.state != new_state or user.hq != new_hq:
                    user.state = new_state
                    user.hq = new_hq
                    updated += 1
        if updated:
            await db.commit()
            print(f"Updated state/hq for {updated} existing users.")
        else:
            print("State/hq already up to date for all users.")

        # ── Activity Types ─────────────────────────────────────────────────────
        count = (await db.execute(select(ActivityType))).scalars().all()
        if count:
            print(f"Activity types already seeded ({len(count)} types) — skipping.")
        else:
            for at_data in SEED_ACTIVITY_TYPES:
                db.add(ActivityType(**at_data))
            await db.commit()
            print(f"Seeded {len(SEED_ACTIVITY_TYPES)} activity types.")

    await engine.dispose()
    print("\nDone! Start the backend and visit http://localhost:5173")
    print("\nQuick login reference:")
    print("  OWNER    : 9999999999 / OTP: 123456")
    print("  MANAGER  : 9888888888 / OTP: 123456")
    print("  FIELD    : 9777777777 / OTP: 123456")
    print("  ACCOUNTS : 9666666666 / OTP: 123456")
    print("\nState assignments:")
    print("  Maharashtra    — Field Agent (9777777777),  Manager (9888888888)")
    print("  Madhya Pradesh — Field Agent Two (9777777776), Manager Two (9888888887)")
    print("  Chhattisgarh   — Field Agent Three (9777777775), Manager Three (9888888886)")


if __name__ == "__main__":
    asyncio.run(seed())

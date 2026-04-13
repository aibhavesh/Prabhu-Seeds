"""
Dev seed script — run once after `alembic upgrade head`.

Creates:
  - 3 OWNER users   (mobile: 9999999999, 9999999998, 9999999997)
  - 3 MANAGER users (mobile: 9888888888, 9888888887, 9888888886)
  - 3 FIELD users   (mobile: 9777777777, 9777777776, 9777777775)  — report to manager-1
  - 3 ACCOUNTS users(mobile: 9666666666, 9666666665, 9666666664)  — report to manager-1
  - All 54 activity types

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
USERS_TO_SEED = [
    # role,      name,                 mobile
    ("OWNER",    "Prabhu Owner",       "9999999999"),
    ("OWNER",    "Owner Two",          "9999999998"),
    ("OWNER",    "Owner Three",        "9999999997"),
    ("MANAGER",  "Demo Manager",       "9888888888"),
    ("MANAGER",  "Manager Two",        "9888888887"),
    ("MANAGER",  "Manager Three",      "9888888886"),
    ("FIELD",    "Field Agent",        "9777777777"),
    ("FIELD",    "Field Agent Two",    "9777777776"),
    ("FIELD",    "Field Agent Three",  "9777777775"),
    ("ACCOUNTS", "Accounts Staff",     "9666666666"),
    ("ACCOUNTS", "Accounts Staff Two", "9666666665"),
    ("ACCOUNTS", "Accounts Staff Three","9666666664"),
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

        # Count what we already have per role
        role_counts = {}
        for role in ("OWNER", "MANAGER", "FIELD", "ACCOUNTS"):
            cnt = (await db.execute(
                select(func.count()).select_from(User).where(User.role == role)
            )).scalar() or 0
            role_counts[role] = cnt

        to_add = [u for u in USERS_TO_SEED if u[2] not in existing_mobiles]

        if not to_add:
            print("All 12 users already seeded — skipping user creation.")
        else:
            # First pass: create OWNER + MANAGER so we can get manager-1's id
            owners_managers = [u for u in to_add if u[0] in ("OWNER", "MANAGER")]
            for role, name, mobile in owners_managers:
                db.add(User(id=uuid.uuid4(), name=name, mobile=mobile, role=role, is_active=True))
            await db.flush()

            # Resolve manager-1 id (first manager by mobile desc = highest number)
            manager_result = await db.execute(
                select(User).where(User.role == "MANAGER").order_by(User.mobile.desc()).limit(1)
            )
            manager1 = manager_result.scalar_one_or_none()

            # Second pass: FIELD + ACCOUNTS reporting to manager-1
            subordinates = [u for u in to_add if u[0] in ("FIELD", "ACCOUNTS")]
            for role, name, mobile in subordinates:
                db.add(User(
                    id=uuid.uuid4(), name=name, mobile=mobile, role=role,
                    manager_id=manager1.id if manager1 else None,
                    is_active=True,
                ))

            await db.commit()
            print(f"Created {len(to_add)} new users:")
            for role, name, mobile in to_add:
                print(f"  {role:<10} -> mobile: {mobile}  name: {name}  (OTP: 123456)")

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


if __name__ == "__main__":
    asyncio.run(seed())

"""
Dev seed script — run once after `alembic upgrade head`.

Creates:
  - One OWNER user  (mobile: 9999999999, OTP in dev mode: 123456)
  - One MANAGER user (mobile: 9888888888)
  - One FIELD user   (mobile: 9777777777, reports to manager)
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
from sqlalchemy import select, text

from app.core.config import settings
from app.models.user import User
from app.models.activity_type import ActivityType
from app.services.activity_type_service import SEED_ACTIVITY_TYPES


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as db:
        # ── Users ──────────────────────────────────────────────────────────
        existing = (await db.execute(select(User).limit(1))).scalar_one_or_none()
        if existing:
            print("Users already seeded — skipping user creation.")
        else:
            owner = User(
                id=uuid.uuid4(),
                name="Prabhu Owner",
                mobile="9999999999",
                role="OWNER",
                is_active=True,
            )
            manager = User(
                id=uuid.uuid4(),
                name="Demo Manager",
                mobile="9888888888",
                role="MANAGER",
                is_active=True,
            )
            db.add(owner)
            db.add(manager)
            await db.flush()

            field = User(
                id=uuid.uuid4(),
                name="Field Agent",
                mobile="9777777777",
                role="FIELD",
                manager_id=manager.id,
                is_active=True,
            )
            db.add(field)
            accounts = User(
                id=uuid.uuid4(),
                name="Accounts Staff",
                mobile="9666666666",
                role="ACCOUNTS",
                manager_id=manager.id,
                is_active=True,
            )
            db.add(accounts)
            await db.commit()
            print("Created 4 users:")
            print(f"  OWNER    -> mobile: 9999999999  (OTP: 123456)")
            print(f"  MANAGER  -> mobile: 9888888888  (OTP: 123456)")
            print(f"  FIELD    -> mobile: 9777777777  (OTP: 123456)")
            print(f"  ACCOUNTS -> mobile: 9666666666  (OTP: 123456)")

        # ── Activity Types ─────────────────────────────────────────────────
        count = (await db.execute(select(ActivityType))).scalars().all()
        if count:
            print(f"Activity types already seeded ({len(count)} types) — skipping.")
        else:
            for at_data in SEED_ACTIVITY_TYPES:
                db.add(ActivityType(**at_data))
            await db.commit()
            print(f"✓ Seeded {len(SEED_ACTIVITY_TYPES)} activity types.")

    await engine.dispose()
    print("\nDone! Start the backend and visit http://localhost:5173")


if __name__ == "__main__":
    asyncio.run(seed())

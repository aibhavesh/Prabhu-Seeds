"""
Insert a real OWNER user: Kuldeep Soni, mobile 9893859780.
Safe to re-run — skips if mobile already exists.

Usage (from backend directory):
    venv/Scripts/activate
    python scripts/insert_owner.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import uuid
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select

from app.core.config import settings
from app.models.user import User


MOBILE = "9893859780"
NAME = "Kuldeep"
SURNAME = "Soni"
ROLE = "OWNER"


async def insert_owner():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as db:
        existing = (await db.execute(
            select(User).where(User.mobile == MOBILE)
        )).scalar_one_or_none()

        if existing:
            print(f"Owner with mobile {MOBILE} already exists (id={existing.id}, name={existing.name}). No changes made.")
            return

        owner = User(
            id=uuid.uuid4(),
            name=NAME,
            surname=SURNAME,
            mobile=MOBILE,
            role=ROLE,
            is_active=True,
        )
        db.add(owner)
        await db.commit()
        print(f"Owner inserted successfully:")
        print(f"  id      : {owner.id}")
        print(f"  name    : {owner.name} {owner.surname}")
        print(f"  mobile  : {owner.mobile}")
        print(f"  role    : {owner.role}")
        print(f"  active  : {owner.is_active}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(insert_owner())

"""
Shared pytest fixtures.

Integration tests require a real PostgreSQL instance. Set TEST_DATABASE_URL (or
DATABASE_URL) in the environment before running.  Unit tests (test_visibility,
test_auth) work without a database.
"""
import os
import uuid
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

# ---------------------------------------------------------------------------
# App imports — make sure models are all imported so metadata is complete
# ---------------------------------------------------------------------------
from app.core.database import Base, get_db
from app.core.dependencies import get_current_user
from app.main import app
import app.models  # noqa: F401 — registers all ORM classes with Base


# ---------------------------------------------------------------------------
# Database engine (session-scoped — created once, tables dropped at teardown)
# ---------------------------------------------------------------------------
def _db_url() -> str:
    url = os.environ.get("TEST_DATABASE_URL") or os.environ.get("DATABASE_URL", "")
    if not url:
        pytest.skip("No TEST_DATABASE_URL set — skipping DB test", allow_module_level=True)
    return url


@pytest_asyncio.fixture(scope="session")
async def engine():
    url = _db_url()
    eng = create_async_engine(url, poolclass=NullPool, echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)   # clean slate
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


@pytest_asyncio.fixture
async def db(engine) -> AsyncGenerator[AsyncSession, None]:
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        yield session


# ---------------------------------------------------------------------------
# Wipe tables between tests (delete in FK-safe order)
# ---------------------------------------------------------------------------
_TRUNCATE_SQL = """
TRUNCATE
    user_consents, audit_log, notifications, activity_types,
    leaves, expenses, gps_waypoints, attendance,
    task_records, tasks, order_items, orders, products,
    dealer_assignments, dealers, district_assignments, districts, users
CASCADE;
"""


@pytest_asyncio.fixture(autouse=True)
async def clean_db(engine):
    yield
    async with engine.begin() as conn:
        await conn.execute(text(_TRUNCATE_SQL))


# ---------------------------------------------------------------------------
# User factories
# ---------------------------------------------------------------------------
from app.models.user import User  # noqa: E402 — after Base import


def _user(**kw) -> User:
    defaults = dict(
        id=uuid.uuid4(),
        name="User",
        mobile=f"9{uuid.uuid4().int % 900_000_000 + 100_000_000:09d}",
        role="FIELD",
        is_active=True,
        manager_id=None,
    )
    defaults.update(kw)
    return User(**defaults)


@pytest_asyncio.fixture
async def owner(db: AsyncSession) -> User:
    u = _user(name="Owner", role="OWNER", mobile="9100000001")
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u


@pytest_asyncio.fixture
async def manager(db: AsyncSession) -> User:
    u = _user(name="Manager", role="MANAGER", mobile="9100000002")
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u


@pytest_asyncio.fixture
async def field_agent(db: AsyncSession, manager: User) -> User:
    u = _user(name="Field", role="FIELD", mobile="9100000003", manager_id=manager.id)
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u


# ---------------------------------------------------------------------------
# HTTP client factories with dependency overrides
# ---------------------------------------------------------------------------
def _make_client(current_user: User, session: AsyncSession) -> AsyncClient:
    async def _db():
        yield session

    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[get_current_user] = lambda: current_user
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


@pytest_asyncio.fixture
async def owner_client(owner: User, db: AsyncSession):
    async with _make_client(owner, db) as client:
        yield client
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def manager_client(manager: User, db: AsyncSession):
    async with _make_client(manager, db) as client:
        yield client
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def field_client(field_agent: User, db: AsyncSession):
    async with _make_client(field_agent, db) as client:
        yield client
    app.dependency_overrides.clear()

import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import context

# Load all models so Alembic can see them for autogenerate
import app.models  # noqa: F401 — registers all ORM classes on Base.metadata
from app.core.database import Base
from app.core.config import settings

# Alembic Config object (access to alembic.ini values)
config = context.config

# NOTE: We do NOT call config.set_main_option("sqlalchemy.url", ...) here because
# configparser treats % as an interpolation character and will reject URLs that
# contain %-encoded characters (e.g. %40 for @). We pass the URL directly to
# create_async_engine instead.

# Set up Python logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# The metadata Alembic compares against when autogenerating migrations
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode — generates SQL script without connecting.
    Useful for reviewing SQL before applying, or for DBAs who apply SQL manually.
    """
    context.configure(
        url=settings.DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations using an async engine (required for asyncpg driver)."""
    # Create the engine directly from settings — bypasses configparser interpolation
    connectable = create_async_engine(
        settings.DATABASE_URL,
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    """Entry point for online mode (normal `alembic upgrade head` usage)."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

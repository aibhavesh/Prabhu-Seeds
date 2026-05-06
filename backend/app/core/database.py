from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from app.core.config import settings


# Supabase uses pgbouncer in transaction mode (port 6543).
# pgbouncer does NOT support PostgreSQL prepared statements.
# Fix: set statement_cache_size=0 in asyncpg connect_args to disable the prepared
# statement cache, and use NullPool so SQLAlchemy doesn't maintain its own pool
# on top of pgbouncer's pool.
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    poolclass=NullPool,
    connect_args={
        "statement_cache_size": 0,   # required for pgbouncer transaction mode
    },
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:  # type: ignore[return]
    async with AsyncSessionLocal() as session:
        yield session

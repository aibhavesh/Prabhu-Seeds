import os
import sys
import socket
import subprocess
from contextlib import asynccontextmanager
from urllib.parse import urlparse
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
import sentry_sdk

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.redis import close_redis
from app.api.v1.router import api_router

# Root of the backend project (directory that contains alembic.ini)
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _db_reachable(url: str, timeout: float = 3.0) -> bool:
    """Quick TCP probe to see if the DB host:port is reachable before invoking alembic."""
    try:
        parsed = urlparse(url.replace("+asyncpg", "").replace("+psycopg2", ""))
        host = parsed.hostname or ""
        port = parsed.port or 5432
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def _run_migrations() -> None:
    """
    Run `alembic upgrade head` before the async server starts.
    Silently skips if the migration DB host is unreachable (e.g. port 5432
    blocked on a mobile hotspot). In that case the schema is assumed current.
    Run `alembic upgrade head` manually after adding new migrations.
    """
    migration_url = settings.DIRECT_DATABASE_URL or settings.DATABASE_URL
    if not _db_reachable(migration_url):
        return  # DB not reachable — skip silently, schema already current

    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        capture_output=True,
        text=True,
        cwd=_BACKEND_DIR,
    )
    if result.returncode == 0:
        if result.stdout.strip():
            logger.info(f"Alembic: {result.stdout.strip()}")
        logger.info("Migrations applied successfully.")
    else:
        logger.error(f"Migration failed:\n{result.stderr.strip()}")
        raise RuntimeError("DB migration failed — see logs above.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    # 1 — apply any pending migrations (idempotent — safe to run every startup)
    _run_migrations()

    # 2 — seed canonical activity types + attributes (skipped silently if DB unreachable)
    if _db_reachable(settings.DATABASE_URL):
        from app.services.activity_type_service import seed_activity_types
        async with AsyncSessionLocal() as db:
            try:
                await seed_activity_types(db)
                logger.info("Activity types + attributes seeded/refreshed.")
            except Exception as exc:
                logger.error(f"Seed failed: {exc}")
                raise

    yield
    await close_redis()
    logger.info("Shutting down.")


if settings.SENTRY_DSN:
    sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.1)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def maintenance_mode(request: Request, call_next):
    if settings.MAINTENANCE_MODE and request.url.path not in ("/health", "/docs", "/redoc", "/openapi.json"):
        return JSONResponse(status_code=503, content={"detail": "Service under maintenance"})
    return await call_next(request)


@app.get("/health", tags=["Health"])
async def health() -> dict:
    return {"status": "ok", "version": settings.APP_VERSION}


app.include_router(api_router, prefix="/api/v1")

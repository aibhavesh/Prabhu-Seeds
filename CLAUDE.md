# PGA AgriTask Backend

## Quick Start
```bash
pip install -r requirements.txt  # or: pip install -r requirements-dev.txt
cp .env.example .env             # edit with your credentials
make dev                         # starts uvicorn on port 8000
```

## Project Structure
- `app/api/v1/` — FastAPI route handlers
- `app/core/` — Config, security, database setup
- `app/models/` — SQLAlchemy ORM models (14 tables)
- `app/schemas/` — Pydantic v2 request/response schemas
- `app/services/` — Business logic layer
- `app/integrations/` — MSG91, Google Maps clients
- `tests/` — pytest-asyncio test suite
- `alembic/` — Database migrations
- `supabase/` — SQL schema + RLS policies

## Key Commands
- `make dev` — Run dev server
- `make test` — Run tests with coverage
- `make lint` — ruff + mypy
- `make migrate` — Apply migrations
- `docker-compose up -d` — Start all services

## API Docs
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Roles
owner, manager, field, accounts — enforced via JWT claims + route-level checks

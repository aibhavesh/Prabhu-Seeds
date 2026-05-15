from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models.user import User
from app.services import analytics_service

router = APIRouter()


@router.get("/")
async def get_analytics(
    current_user: Annotated[User, Depends(require_roles("OWNER", "MANAGER", "ACCOUNTS"))],
    db: Annotated[AsyncSession, Depends(get_db)],
    month: date | None = Query(default=None, description="Filter month as YYYY-MM-DD (uses year+month only)"),
) -> dict:
    return await analytics_service.get_full_analytics(current_user, db, month=month)

from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose.exceptions import JWTError

from app.core.database import get_db
from app.core.security import get_user_id_from_token

bearer_scheme = HTTPBearer()


async def get_current_user_id(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
) -> str:
    try:
        return get_user_id_from_token(credentials.credentials)
    except (JWTError, Exception):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> "User":  # type: ignore[name-defined]
    from app.models.user import User
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def require_roles(*roles: str):
    async def _check(user: Annotated["User", Depends(get_current_user)]) -> "User":  # type: ignore[name-defined]
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user
    return _check

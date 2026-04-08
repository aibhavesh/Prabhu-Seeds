from datetime import datetime, timezone
from typing import Any
import jose.jwt as jwt
from jose.exceptions import JWTError
from app.core.config import settings


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate JWT. Works for both Supabase and local JWTs."""
    return jwt.decode(
        token,
        settings.effective_jwt_secret,
        algorithms=[settings.JWT_ALGORITHM],
        options={"verify_aud": False},
    )


def get_user_id_from_token(token: str) -> str:
    payload = decode_token(token)
    user_id: str | None = payload.get("sub")
    if not user_id:
        raise JWTError("Token missing sub claim")
    return user_id

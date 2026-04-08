import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt
from loguru import logger

from app.core.config import settings
from app.models.user import User
from app.integrations.msg91 import send_otp, verify_otp


def create_access_token(user: User) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    payload = {
        "sub": str(user.id),
        "role": user.role,
        "exp": expire,
    }
    return jwt.encode(payload, settings.effective_jwt_secret, algorithm=settings.JWT_ALGORITHM)


async def initiate_otp(mobile: str, db: AsyncSession) -> dict:
    result = await db.execute(select(User).where(User.mobile == mobile))
    user = result.scalar_one_or_none()
    if not user:
        return {"success": False, "message": "Mobile number not registered. Contact your manager."}

    sent = await send_otp(mobile)
    if not sent:
        return {"success": False, "message": "Failed to send OTP. Try again."}

    return {"success": True, "message": "OTP sent successfully"}


async def verify_and_login(mobile: str, otp: str, db: AsyncSession) -> dict:
    valid = await verify_otp(mobile, otp)
    if not valid:
        return {"success": False, "message": "Invalid or expired OTP"}

    result = await db.execute(select(User).where(User.mobile == mobile))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        return {"success": False, "message": "Account not found or disabled"}

    token = create_access_token(user)
    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "user_id": str(user.id),
        "role": user.role,
        "name": user.name,
    }

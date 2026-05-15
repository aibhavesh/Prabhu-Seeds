from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt
from loguru import logger
import bcrypt as _bcrypt

from app.core.config import settings
from app.models.user import User


def hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt(12)).decode()


def verify_password(plain: str, hashed: str | None) -> bool:
    if not hashed:
        return False
    try:
        return _bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ── Password helpers (web app) ─────────────────────────────────────────────

def hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt(12)).decode()


def verify_password(plain: str, hashed: str | None) -> bool:
    if not hashed:
        return False
    try:
        return _bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ── Token helpers ──────────────────────────────────────────────────────────

def create_access_token(user: User) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    payload = {
        "sub": str(user.id),
        "role": user.role,
        "exp": expire,
    }
    return jwt.encode(payload, settings.effective_jwt_secret, algorithm=settings.JWT_ALGORITHM)


def _normalize_mobile(mobile: str) -> str:
    digits = ''.join(c for c in mobile if c.isdigit())
    if len(digits) == 12 and digits.startswith('91'):
        digits = digits[2:]
    if len(digits) != 10:
        raise ValueError(f"Invalid mobile number '{mobile}'. Expected 10 digits.")
    return digits


def _build_login_response(user: User) -> dict:
    token = create_access_token(user)
    return {
        "success": True,
        "token": token,
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "role": user.role.lower(),
            "name": user.name,
            "mobile": user.mobile,
        },
    }


# ── Web app: password-based login ──────────────────────────────────────────

async def login(mobile: str, password: str, db: AsyncSession) -> dict:
    mobile = _normalize_mobile(mobile)
    result = await db.execute(select(User).where(User.mobile == mobile))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        return {"success": False, "message": "Mobile number not registered. Contact your administrator."}
    if not verify_password(password, user.password_hash):
        return {"success": False, "message": "Incorrect password."}
    return _build_login_response(user)


# ── Mobile app: OTP-based login ────────────────────────────────────────────

async def initiate_otp(mobile: str, db: AsyncSession) -> dict:
    mobile = _normalize_mobile(mobile)
    result = await db.execute(select(User).where(User.mobile == mobile))
    user = result.scalar_one_or_none()
    if not user:
        return {"success": False, "message": "Mobile number not registered. Contact your manager."}

    sent = await send_otp(mobile)
    if not sent:
        return {"success": False, "message": "Failed to send OTP. Try again."}

    return {"success": True, "message": "OTP sent successfully"}


async def verify_and_login(mobile: str, otp: str, db: AsyncSession) -> dict:
    mobile = _normalize_mobile(mobile)
    valid = await verify_otp(mobile, otp)
    if not valid:
        return {"success": False, "message": "Invalid or expired OTP"}

    result = await db.execute(select(User).where(User.mobile == mobile))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        return {"success": False, "message": "Account not found or disabled"}

    return _build_login_response(user)

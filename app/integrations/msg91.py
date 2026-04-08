import httpx
from loguru import logger
from app.core.config import settings


MSG91_OTP_URL = "https://control.msg91.com/api/v5/otp"
MSG91_VERIFY_URL = "https://control.msg91.com/api/v5/otp/verify"
MSG91_RESEND_URL = "https://control.msg91.com/api/v5/otp/retry"


async def send_otp(mobile: str) -> bool:
    """Send OTP to Indian mobile number via MSG91."""
    if not settings.MSG91_AUTH_KEY:
        logger.warning("MSG91_AUTH_KEY not set — skipping OTP send (dev mode)")
        return True

    params = {
        "authkey": settings.MSG91_AUTH_KEY,
        "template_id": settings.MSG91_TEMPLATE_ID,
        "mobile": f"91{mobile}",
        "otp_expiry": 2,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.post(MSG91_OTP_URL, params=params)
            data = resp.json()
            if data.get("type") == "success":
                return True
            logger.error(f"MSG91 send_otp failed: {data}")
            return False
        except Exception as e:
            logger.error(f"MSG91 send_otp error: {e}")
            return False


async def verify_otp(mobile: str, otp: str) -> bool:
    """Verify OTP submitted by user."""
    if not settings.MSG91_AUTH_KEY:
        # Dev mode: accept "123456" as valid OTP
        return otp == "123456"

    params = {
        "authkey": settings.MSG91_AUTH_KEY,
        "mobile": f"91{mobile}",
        "otp": otp,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(MSG91_VERIFY_URL, params=params)
            data = resp.json()
            return data.get("type") == "success"
        except Exception as e:
            logger.error(f"MSG91 verify_otp error: {e}")
            return False


async def resend_otp(mobile: str, retry_type: str = "text") -> bool:
    """Resend OTP (voice or text)."""
    if not settings.MSG91_AUTH_KEY:
        return True

    params = {
        "authkey": settings.MSG91_AUTH_KEY,
        "mobile": f"91{mobile}",
        "retrytype": retry_type,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(MSG91_RESEND_URL, params=params)
            data = resp.json()
            return data.get("type") == "success"
        except Exception as e:
            logger.error(f"MSG91 resend_otp error: {e}")
            return False

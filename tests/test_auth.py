"""
Unit tests for app/services/auth_service.py.
MSG91 I/O is mocked; no database or network required.
"""
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from jose import jwt

from app.core.config import settings
from app.services.auth_service import create_access_token, initiate_otp, verify_and_login


def _mock_user(**kw):
    u = MagicMock()
    u.id = kw.get("id", uuid.uuid4())
    u.role = kw.get("role", "FIELD")
    u.name = kw.get("name", "Test User")
    u.mobile = kw.get("mobile", "9000000000")
    u.is_active = kw.get("is_active", True)
    return u


# ---------------------------------------------------------------------------
# create_access_token
# ---------------------------------------------------------------------------
class TestCreateAccessToken:
    def test_returns_string(self):
        user = _mock_user()
        token = create_access_token(user)
        assert isinstance(token, str)
        assert len(token) > 20

    def test_payload_contains_sub_and_role(self):
        user = _mock_user(role="MANAGER")
        token = create_access_token(user)
        payload = jwt.decode(
            token,
            settings.effective_jwt_secret,
            algorithms=[settings.JWT_ALGORITHM],
        )
        assert payload["sub"] == str(user.id)
        assert payload["role"] == "MANAGER"

    def test_token_expires(self):
        import time

        user = _mock_user()
        token = create_access_token(user)
        payload = jwt.decode(
            token,
            settings.effective_jwt_secret,
            algorithms=[settings.JWT_ALGORITHM],
        )
        # exp should be in the future
        assert payload["exp"] > time.time()


# ---------------------------------------------------------------------------
# initiate_otp
# ---------------------------------------------------------------------------
class TestInitiateOtp:
    @pytest.mark.asyncio
    async def test_unregistered_number(self):
        db = AsyncMock()
        db.execute.return_value.scalar_one_or_none.return_value = None
        result = await initiate_otp("9000000000", db)
        assert result["success"] is False
        assert "not registered" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_registered_number_otp_sent(self):
        db = AsyncMock()
        db.execute.return_value.scalar_one_or_none.return_value = _mock_user()
        with patch("app.services.auth_service.send_otp", new=AsyncMock(return_value=True)):
            result = await initiate_otp("9000000000", db)
        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_otp_send_failure(self):
        db = AsyncMock()
        db.execute.return_value.scalar_one_or_none.return_value = _mock_user()
        with patch("app.services.auth_service.send_otp", new=AsyncMock(return_value=False)):
            result = await initiate_otp("9000000000", db)
        assert result["success"] is False
        assert "failed" in result["message"].lower()


# ---------------------------------------------------------------------------
# verify_and_login
# ---------------------------------------------------------------------------
class TestVerifyAndLogin:
    @pytest.mark.asyncio
    async def test_invalid_otp(self):
        db = AsyncMock()
        with patch("app.services.auth_service.verify_otp", new=AsyncMock(return_value=False)):
            result = await verify_and_login("9000000000", "999999", db)
        assert result["success"] is False
        assert "invalid" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_inactive_user(self):
        db = AsyncMock()
        user = _mock_user(is_active=False)
        db.execute.return_value.scalar_one_or_none.return_value = user
        with patch("app.services.auth_service.verify_otp", new=AsyncMock(return_value=True)):
            result = await verify_and_login("9000000000", "123456", db)
        assert result["success"] is False

    @pytest.mark.asyncio
    async def test_success_response_shape(self):
        db = AsyncMock()
        user = _mock_user(role="FIELD", name="Raju")
        db.execute.return_value.scalar_one_or_none.return_value = user
        with patch("app.services.auth_service.verify_otp", new=AsyncMock(return_value=True)):
            result = await verify_and_login("9000000000", "123456", db)
        assert result["success"] is True
        assert "token" in result
        assert "access_token" in result
        assert result["user"]["role"] == "field"          # must be lowercase
        assert result["user"]["name"] == "Raju"
        assert result["user"]["id"] == str(user.id)

    @pytest.mark.asyncio
    async def test_user_not_found_after_valid_otp(self):
        db = AsyncMock()
        db.execute.return_value.scalar_one_or_none.return_value = None
        with patch("app.services.auth_service.verify_otp", new=AsyncMock(return_value=True)):
            result = await verify_and_login("9000000000", "123456", db)
        assert result["success"] is False

from pydantic import BaseModel, field_validator
import re


class OTPSendRequest(BaseModel):
    mobile: str

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        v = v.strip()
        # Strip country code prefix as a whole string, not char-by-char
        if v.startswith("+91"):
            v = v[3:]
        elif v.startswith("91") and len(v) == 12:
            v = v[2:]
        if not re.fullmatch(r"[6-9]\d{9}", v):
            raise ValueError("Invalid Indian mobile number")
        return v


class OTPVerifyRequest(BaseModel):
    mobile: str
    otp: str

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        v = v.strip()
        # Strip country code prefix as a whole string, not char-by-char
        if v.startswith("+91"):
            v = v[3:]
        elif v.startswith("91") and len(v) == 12:
            v = v[2:]
        if not re.fullmatch(r"[6-9]\d{9}", v):
            raise ValueError("Invalid Indian mobile number")
        return v


class UserInfo(BaseModel):
    id: str
    role: str   # lowercase: owner | manager | field | accounts
    name: str
    mobile: str


class TokenResponse(BaseModel):
    """Shape expected by the React frontend authStore."""
    token: str          # frontend reads data.token
    access_token: str   # kept for API consumers / Swagger
    token_type: str = "bearer"
    user: UserInfo      # frontend reads data.user.role / data.user.name

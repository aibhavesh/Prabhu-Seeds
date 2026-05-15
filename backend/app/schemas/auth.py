from pydantic import BaseModel, field_validator
import re


def _clean_mobile(v: str) -> str:
    v = v.strip()
    if v.startswith("+91"):
        v = v[3:]
    elif v.startswith("91") and len(v) == 12:
        v = v[2:]
    if not re.fullmatch(r"[6-9]\d{9}", v):
        raise ValueError("Invalid Indian mobile number")
    return v


class LoginRequest(BaseModel):
    mobile: str
    password: str

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        return _clean_mobile(v)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserInfo(BaseModel):
    id: str
    role: str
    name: str
    mobile: str


class TokenResponse(BaseModel):
    token: str
    access_token: str
    token_type: str = "bearer"
    user: UserInfo

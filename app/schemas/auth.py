from pydantic import BaseModel, field_validator
import re


class OTPSendRequest(BaseModel):
    mobile: str

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        v = v.strip().lstrip("+91").lstrip("91")
        if not re.fullmatch(r"[6-9]\d{9}", v):
            raise ValueError("Invalid Indian mobile number")
        return v


class OTPVerifyRequest(BaseModel):
    mobile: str
    otp: str

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        v = v.strip().lstrip("+91").lstrip("91")
        if not re.fullmatch(r"[6-9]\d{9}", v):
            raise ValueError("Invalid Indian mobile number")
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    name: str

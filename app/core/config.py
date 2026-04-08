from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl
import json
from typing import Any


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "PGA AgriTask API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    MAINTENANCE_MODE: bool = False

    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"

    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    MSG91_AUTH_KEY: str = ""
    MSG91_TEMPLATE_ID: str = ""
    MSG91_SENDER_ID: str = "PGAAGR"

    GOOGLE_MAPS_API_KEY: str = ""

    SENTRY_DSN: str = ""

    JWT_SECRET_KEY: str = "change-me-in-production-at-least-32-chars"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 8

    OTP_MAX_REQUESTS: int = 3
    OTP_RATE_LIMIT_MINUTES: int = 10

    @property
    def effective_jwt_secret(self) -> str:
        return self.SUPABASE_JWT_SECRET or self.JWT_SECRET_KEY


settings = Settings()

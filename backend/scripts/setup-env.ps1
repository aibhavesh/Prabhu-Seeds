# Generates .env with random secrets — called by setup.bat
$root = Split-Path $PSScriptRoot -Parent
$envPath = Join-Path $root ".env"

$jwt = [Convert]::ToBase64String(
    [Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
)

$content = @"
APP_NAME=PGA AgriTask API
APP_VERSION=1.0.0
DEBUG=true
MAINTENANCE_MODE=false

CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]

# Database  (Docker dev container)
DATABASE_URL=postgresql+asyncpg://pgauser:pgapassword@localhost:5432/prabhu_seeds

# Redis  (Docker dev container)
REDIS_URL=redis://localhost:6379/0

# Supabase — leave as-is for local dev (JWT auth uses JWT_SECRET_KEY below)
SUPABASE_URL=http://localhost
SUPABASE_ANON_KEY=local-dev
SUPABASE_SERVICE_ROLE_KEY=local-dev
SUPABASE_JWT_SECRET=$jwt

# JWT  (auto-generated — do not share)
JWT_SECRET_KEY=$jwt
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=8

# Optional integrations (leave blank to disable)
GOOGLE_MAPS_API_KEY=
MSG91_AUTH_KEY=
MSG91_TEMPLATE_ID=
MSG91_SENDER_ID=PGAAGR
SENTRY_DSN=

# OTP rate limiting
OTP_MAX_REQUESTS=3
OTP_RATE_LIMIT_MINUTES=10
"@

$content | Set-Content -Path $envPath -Encoding UTF8
Write-Host "  .env created with auto-generated secrets."

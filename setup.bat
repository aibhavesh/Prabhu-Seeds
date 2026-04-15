@echo off
setlocal EnableDelayedExpansion
title PGA AgriTask - Setup
chcp 65001 > nul 2>&1

echo.
echo  ============================================================
echo   PGA AgriTask  ^|  First-Time Setup
echo  ============================================================
echo.
echo  This will install everything needed to run the app locally:
echo    - PostgreSQL + Redis  (via Docker)
echo    - Python backend      (FastAPI)
echo    - React frontend      (Vite)
echo.
echo  Prerequisites: Python 3.11+, Node.js 18+, Docker Desktop
echo  ============================================================
echo.
pause

cd /d "%~dp0"

:: ─── 1. PYTHON ───────────────────────────────────────────────────────────────
echo.
echo [1/7] Checking Python 3.11+...
python --version > nul 2>&1
if errorlevel 1 (
    echo.
    echo  ERROR: Python not found.
    echo  Download: https://www.python.org/downloads/
    echo  Tick "Add Python to PATH" during install, then re-run this script.
    echo.
    pause & exit /b 1
)
for /f "tokens=2" %%v in ('python --version 2^>^&1') do set PYVER=%%v
for /f "tokens=1 delims=." %%a in ("!PYVER!") do set PYMAJ=%%a
for /f "tokens=2 delims=." %%b in ("!PYVER!") do set PYMIN=%%b
if !PYMAJ! LSS 3 goto :python_old
if !PYMAJ! EQL 3 if !PYMIN! LSS 11 goto :python_old
echo  Python !PYVER! ... OK
goto :check_node
:python_old
echo  ERROR: Python !PYVER! found — 3.11+ required.
echo  Download: https://www.python.org/downloads/
pause & exit /b 1

:: ─── 2. NODE.JS ──────────────────────────────────────────────────────────────
:check_node
echo.
echo [2/7] Checking Node.js 18+...
node --version > nul 2>&1
if errorlevel 1 (
    echo.
    echo  ERROR: Node.js not found.
    echo  Download: https://nodejs.org/  (choose the LTS version)
    echo.
    pause & exit /b 1
)
for /f %%v in ('node --version') do set NODEVER=%%v
for /f "tokens=1 delims=." %%a in ("!NODEVER:~1!") do set NODEMAJ=%%a
if !NODEMAJ! LSS 18 (
    echo  ERROR: Node.js !NODEVER! found — 18+ required.
    echo  Download: https://nodejs.org/
    pause & exit /b 1
)
echo  Node.js !NODEVER! ... OK

:: ─── 3. DOCKER ───────────────────────────────────────────────────────────────
echo.
echo [3/7] Checking Docker Desktop...
docker --version > nul 2>&1
if errorlevel 1 (
    echo.
    echo  ERROR: Docker not found.
    echo  Download: https://www.docker.com/products/docker-desktop/
    echo  Install it, start Docker Desktop, then re-run this script.
    echo.
    pause & exit /b 1
)
docker info > nul 2>&1
if errorlevel 1 (
    echo.
    echo  ERROR: Docker is installed but not running.
    echo  Open Docker Desktop, wait for it to start, then re-run.
    echo.
    pause & exit /b 1
)
echo  Docker ... OK
echo.
echo  Starting PostgreSQL + Redis containers...
docker-compose -f backend\docker-compose.dev.yml up -d
if errorlevel 1 (
    echo  ERROR: Failed to start containers. Check Docker Desktop logs.
    pause & exit /b 1
)
echo.
echo  Waiting for PostgreSQL to be ready...
:wait_pg
docker-compose -f backend\docker-compose.dev.yml exec -T postgres pg_isready -U pgauser -d prabhu_seeds > nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak > nul
    goto :wait_pg
)
echo  PostgreSQL is ready!

:: ─── 4. PYTHON VENV + PACKAGES ───────────────────────────────────────────────
echo.
echo [4/7] Setting up Python environment...
if not exist "backend\venv\" (
    echo  Creating virtual environment...
    python -m venv backend\venv
)
call backend\venv\Scripts\activate.bat
echo  Installing Python packages (may take a minute)...
pip install -r backend\requirements.txt -q
if errorlevel 1 (
    echo  ERROR: pip install failed.
    pause & exit /b 1
)
echo  Python packages ... OK

:: ─── 5. CONFIG FILES ─────────────────────────────────────────────────────────
echo.
echo [5/7] Creating config files...

if not exist "backend\.env" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "backend\scripts\setup-env.ps1"
) else (
    echo  backend/.env already exists, skipping.
)

if not exist "frontend\.env" (
    echo VITE_API_URL=http://localhost:8000> "frontend\.env"
    echo  frontend/.env created.
) else (
    echo  frontend/.env already exists, skipping.
)

:: ─── 6. DATABASE MIGRATIONS + SEED ───────────────────────────────────────────
echo.
echo [6/7] Setting up database...
echo  Running migrations...
cd /d "%~dp0backend"
alembic upgrade head
if errorlevel 1 (
    echo  ERROR: Migrations failed. Check that PostgreSQL is running and backend\.env is correct.
    cd /d "%~dp0"
    pause & exit /b 1
)
echo  Migrations ... OK
echo.
echo  Seeding demo accounts...
python scripts\seed_dev.py
if errorlevel 1 (
    echo  NOTE: Seed returned a warning (accounts may already exist — this is OK).
)
echo  Seed ... OK
cd /d "%~dp0"

:: ─── 7. FRONTEND PACKAGES ────────────────────────────────────────────────────
echo.
echo [7/7] Installing frontend packages (may take a minute)...
cd frontend
if not exist "node_modules\" (
    npm install --silent
    if errorlevel 1 (
        echo  ERROR: npm install failed.
        cd ..
        pause & exit /b 1
    )
) else (
    echo  node_modules already exists, skipping.
)
cd ..

:: ─── DONE ────────────────────────────────────────────────────────────────────
echo 1 > .setup_done

echo.
echo  ============================================================
echo   Setup Complete!
echo  ============================================================
echo.
echo  Demo accounts (password for all: password123)
echo.
echo    Owner    owner@prabhuseeds.com
echo    Manager  manager@prabhuseeds.com
echo    Field 1  field1@prabhuseeds.com
echo    Field 2  field2@prabhuseeds.com
echo    Field 3  field3@prabhuseeds.com
echo    Field 4  field4@prabhuseeds.com
echo.
echo  Run  start.bat  to launch the app.
echo  ============================================================
echo.
pause

@echo off
setlocal EnableDelayedExpansion
title PGA AgriTask - Launcher
chcp 65001 > nul 2>&1

cd /d "%~dp0"

:: Check setup has been run
if not exist ".setup_done" (
    echo.
    echo  ERROR: Setup has not been run yet.
    echo  Please run  setup.bat  first.
    echo.
    pause & exit /b 1
)

:: Check Docker is running
docker info > nul 2>&1
if errorlevel 1 (
    echo.
    echo  ERROR: Docker Desktop is not running.
    echo  Start Docker Desktop, wait for it to load, then try again.
    echo.
    pause & exit /b 1
)

echo.
echo  Starting PGA AgriTask...
echo.

:: Start DB + Redis containers
echo  [1/3] Starting database containers...
docker-compose -f backend\docker-compose.dev.yml up -d > nul 2>&1

:: Brief wait for containers
timeout /t 3 /nobreak > nul

:: Start backend in a new window
echo  [2/3] Starting backend  (http://localhost:8000)...
start "PGA Backend" cmd /k "cd /d "%~dp0backend" && call venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

:: Start frontend in a new window
echo  [3/3] Starting frontend (http://localhost:5173)...
start "PGA Frontend" cmd /k "cd /d "%~dp0\frontend" && npm run dev"

:: Open browser after a short wait
echo.
echo  Opening browser in 5 seconds...
timeout /t 5 /nobreak > nul
start http://localhost:5173

echo.
echo  ============================================================
echo   App is running!
echo.
echo    Frontend  http://localhost:5173
echo    Backend   http://localhost:8000
echo    API Docs  http://localhost:8000/docs
echo.
echo   Close the Backend and Frontend windows to stop the app.
echo   Run  stop.bat  to shut down the database containers.
echo  ============================================================
echo.

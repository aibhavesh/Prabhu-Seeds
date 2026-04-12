@echo off
title PGA AgriTask - Stop
chcp 65001 > nul 2>&1

cd /d "%~dp0"

echo.
echo  Stopping PGA AgriTask database containers...
docker-compose -f docker-compose.dev.yml stop
echo  Done. Your data is preserved — run start.bat to resume.
echo.
pause

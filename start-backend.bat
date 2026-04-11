@echo off
echo Starting PGA AgriTask Backend...
cd /d "%~dp0"
call venv\Scripts\activate
uvicorn app.main:app --reload --port 8000 --host 0.0.0.0

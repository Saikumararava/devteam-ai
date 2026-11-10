@echo off
title DevTeam AI Launcher
echo =========================================
echo        Starting DevTeam AI Workspace
echo =========================================

echo [1/2] Starting FastAPI Backend on http://127.0.0.1:8000...
start "DevTeam AI - Backend" cmd /k "cd /d T:\llmproject\backend && ..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Starting React Frontend on http://localhost:5173...
start "DevTeam AI - Frontend" cmd /k "cd /d T:\llmproject\frontend && npm run dev"

echo.
echo Opening browser to http://localhost:5173...
timeout /t 3 >nul
start http://localhost:5173

echo.
echo Both servers are running! Keep the two command windows open while using DevTeam AI.

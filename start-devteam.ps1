# DevTeam AI One-Click Launcher for Windows
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "       Starting DevTeam AI Workspace     " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Start FastAPI Backend in a new window
Write-Host "[1/2] Starting FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\backend'; ..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

# 2. Start Vite Frontend in a new window
Write-Host "[2/2] Starting React + Vite Frontend on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\frontend'; npm run dev"

Write-Host "`nDevTeam AI is starting! Open your browser to http://localhost:5173" -ForegroundColor Cyan
Start-Process "http://localhost:5173"

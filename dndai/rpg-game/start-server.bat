@echo off
title D&D 5e RPG Game Server
cd /d "%~dp0"
echo ========================================
echo D&D 5e RPG Game Server
echo ========================================
echo.

REM Kill any existing Node processes
echo Stopping any existing servers...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo Stopped existing Node processes.
) else (
    echo No existing Node processes found.
)
echo.

REM Wait a moment for ports to be released
timeout /t 2 /nobreak >nul

echo Starting Next.js server on port 3001...
echo Press Ctrl+C to stop the server
echo.
echo ========================================
echo.
npm run dev
echo.
echo ========================================
echo Server stopped.
echo.
pause

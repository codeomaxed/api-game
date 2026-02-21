@echo off
cd /d "%~dp0"

REM Kill any existing Node processes
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

start "D&D 5e RPG Game Server" cmd /k "cd /d %~dp0 && echo ======================================== && echo D&D 5e RPG Game Server && echo ======================================== && echo. && echo Starting Next.js server on port 3001... && echo Press Ctrl+C to stop the server && echo. && echo ======================================== && echo. && npm run dev && echo. && echo ======================================== && echo Server stopped. && pause"

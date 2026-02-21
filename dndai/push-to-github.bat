@echo off
REM Helper script to quickly stage, commit, and push changes to GitHub
REM This script will:
REM 1. Stage all changes
REM 2. Create a commit with a timestamp
REM 3. Push to GitHub

echo ========================================
echo   Pushing to GitHub
echo ========================================
echo.

REM Check if we're in a git repository
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo ERROR: Not in a git repository!
    echo Please run this script from your project root directory.
    pause
    exit /b 1
)

REM Check if there are any changes to commit
git diff --quiet && git diff --cached --quiet
if errorlevel 0 (
    echo No changes to commit. Everything is up to date!
    pause
    exit /b 0
)

REM Stage all changes
echo [1/3] Staging all changes...
git add .
if errorlevel 1 (
    echo ERROR: Failed to stage changes!
    pause
    exit /b 1
)

REM Create commit with timestamp
echo [2/3] Creating commit...
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set timestamp=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2% %datetime:~8,2%:%datetime:~10,2%:%datetime:~12,2%

git commit -m "Update: %timestamp%"
if errorlevel 1 (
    echo ERROR: Failed to create commit!
    pause
    exit /b 1
)

REM Push to GitHub
echo [3/3] Pushing to GitHub...
git push
if errorlevel 1 (
    echo ERROR: Failed to push to GitHub!
    echo You may need to set up the remote first. See GITHUB_SETUP.md
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Successfully pushed to GitHub!
echo ========================================
pause


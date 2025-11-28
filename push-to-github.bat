@echo off
echo ========================================
echo Falgates Rice Distribution - Git Setup
echo ========================================
echo.

REM Check if git is installed
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Git is not installed or not in PATH
    echo Please install Git from: https://git-scm.com/download/win
    echo Then restart this script.
    pause
    exit /b 1
)

echo [1/5] Initializing git repository...
git init
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to initialize git
    pause
    exit /b 1
)

echo [2/5] Adding all files...
git add .
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to add files
    pause
    exit /b 1
)

echo [3/5] Creating initial commit...
git commit -m "Initial commit: Falgates Rice Distribution Assigner"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to create commit
    pause
    exit /b 1
)

echo [4/5] Adding remote repository...
git remote remove origin 2>nul
git remote add origin https://github.com/aliyuchatgptt/falgates.git
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to add remote
    pause
    exit /b 1
)

echo [5/5] Setting branch to main and pushing...
git branch -M main
git push -u origin main
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to push to GitHub
    echo.
    echo Possible reasons:
    echo - You need to authenticate (GitHub username and password/token)
    echo - Repository permissions issue
    echo - Network connection problem
    echo.
    echo If authentication fails, you may need to:
    echo 1. Use a Personal Access Token instead of password
    echo 2. Generate token at: https://github.com/settings/tokens
    echo.
) else (
    echo.
    echo ========================================
    echo SUCCESS! Code pushed to GitHub
    echo ========================================
    echo Repository: https://github.com/aliyuchatgptt/falgates
    echo.
)

pause


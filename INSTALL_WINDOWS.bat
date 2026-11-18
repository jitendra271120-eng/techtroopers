@echo off
setlocal
cd /d "%~dp0"
echo =============================================
echo   TechTroopers LMS - Package Installer
 echo =============================================
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install Node.js 20 or 22 LTS first.
  pause
  exit /b 1
)
call npm install
if errorlevel 1 (
  echo.
  echo npm install failed. Check internet/proxy and run this file again.
  pause
  exit /b 1
)
echo.
echo Packages installed successfully.
echo Starting TechTroopers...
call npm start
pause

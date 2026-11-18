@echo off
setlocal
cd /d "%~dp0"
echo =============================================
echo   TechTroopers LMS - Install + Build Verify
 echo =============================================
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install Node.js 20 or 22 LTS first.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing packages...
  call npm install
  if errorlevel 1 (
    echo npm install failed. Check your Internet/proxy connection.
    pause
    exit /b 1
  )
)
echo.
echo Running production build...
call npm run build
if errorlevel 1 (
  echo Build failed. Review the error above.
  pause
  exit /b 1
)
echo.
echo BUILD PASSED.
echo Starting development server...
call npm start
pause

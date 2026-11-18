@echo off
cd /d "%~dp0"
where firebase >nul 2>nul
if errorlevel 1 (
  echo Firebase CLI is not installed.
  echo Run: npm install -g firebase-tools
  pause
  exit /b 1
)
echo Deploying Firestore and Storage rules...
firebase deploy --only firestore:rules,storage
pause

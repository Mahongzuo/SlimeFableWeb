@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20.19+ is required. Install it from https://nodejs.org/
  pause
  exit /b 1
)
if not exist "dist\index.html" (
  echo Missing dist build. Run npm install and npm run build first.
  pause
  exit /b 1
)
node scripts\serve.mjs --open
if errorlevel 1 pause

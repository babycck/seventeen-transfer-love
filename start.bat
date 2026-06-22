@echo off
cd /d "%~dp0"
echo Starting dev server...
echo Local: http://localhost:5173/
echo Use --host flag for LAN access
echo.
node node_modules\vite\bin\vite.js
pause

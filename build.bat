@echo off
cd /d "%~dp0"
echo Building...
node node_modules\vite\bin\vite.js build
echo.
echo Done! Open dist\index.html to play
echo.
pause

@echo off
cd /d "%~dp0"
powershell -Command "Get-CimInstance Win32_Process | Where-Object {$_.CommandLine -like '*vite*' -and $_.Name -eq 'node.exe'} | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
echo Server stopped.
pause

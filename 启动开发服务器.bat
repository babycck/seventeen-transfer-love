@echo off
echo ==========================================
echo  SEVENTEEN - 换乘恋爱 Vite 开发服务器
echo ==========================================
echo.

:: 检查 node 是否可用
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [警告] 未检测到 node 命令，尝试使用绝对路径...
    set "NODE_EXE=C:\Program Files\nodejs\node.exe"
) else (
    set "NODE_EXE=node"
)

echo 正在启动 Vite 开发服务器...
echo 启动后请在浏览器打开: http://localhost:5173
echo 按 Ctrl+C 停止服务器
echo.

"%NODE_EXE%" "%~dp0node_modules\vite\bin\vite.js"

pause

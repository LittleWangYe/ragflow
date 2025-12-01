@echo off
REM DeepInsight Mock Server 启动脚本 (Windows)
REM 用法: start-mock-server.bat

echo.
echo ╔══════════════════════════════════════════╗
echo ║  Starting DeepInsight Mock Server...    ║
echo ╚══════════════════════════════════════════╝
echo.

REM 检查 response_confusionQuestion.txt 文件
if not exist "response_confusionQuestion.txt" (
    echo ❌ Error: response_confusionQuestion.txt not found!
    echo.
    echo Please ensure the file exists in the project root.
    pause
    exit /b 1
)

echo ✅ response_confusionQuestion.txt found
echo.

REM 检查 node_modules
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
    echo.
)

REM 启动 mock 服务
echo 🚀 Starting mock server on port 3001...
echo.
echo Press Ctrl+C to stop the server
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

call npm run mock-server
pause

#!/bin/bash

# DeepInsight Mock Server 启动脚本
# 用法: ./start-mock-server.sh

echo "╔══════════════════════════════════════════╗"
echo "║  Starting DeepInsight Mock Server...    ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# 检查 response_confusionQuestion.txt 文件是否存在
if [ ! -f "response_confusionQuestion.txt" ]; then
    echo "❌ Error: response_confusionQuestion.txt not found!"
    echo ""
    echo "Please ensure the file exists in the project root:"
    echo "  /Users/os/Desktop/mine/web/ragflow/web/response_confusionQuestion.txt"
    exit 1
fi

echo "✅ response_confusionQuestion.txt found"
echo ""

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# 检查必要的依赖
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx not found. Please install Node.js and npm."
    exit 1
fi

# 启动 mock 服务
echo "🚀 Starting mock server on port 3001..."
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm run mock-server

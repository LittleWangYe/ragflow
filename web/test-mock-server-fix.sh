#!/bin/bash

echo "🚀 启动 Mock Server..."
npm run mock-server > /tmp/mock-server.log 2>&1 &
SERVER_PID=$!
echo "服务器 PID: $SERVER_PID"

sleep 3

echo ""
echo "📡 测试 Conference Question 端点（最多等待 15 秒）..."
timeout 15 curl -s -X POST http://localhost:3001/api/deepinsight/conference_question \
  -H "Content-Type: application/json" \
  -d '{}' | wc -l

echo ""
echo "📊 检查日志中的发送情况..."
grep -E "已发送|完成|断开" /tmp/mock-server.log | tail -10

echo ""
echo "🛑 停止服务器..."
kill $SERVER_PID 2>/dev/null || true
sleep 1

echo "✅ 测试完成"

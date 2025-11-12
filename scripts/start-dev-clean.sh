#!/bin/bash

echo "🧹 清理开发环境..."

# 杀死占用3000端口的进程
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 1

# 清理Next.js缓存
rm -rf .next
rm -rf node_modules/.cache

echo "✅ 清理完成"
echo "🚀 启动开发服务器..."

# 启动服务器
npm run dev

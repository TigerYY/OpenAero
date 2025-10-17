#!/bin/bash

# OpenAero 优化开发服务器启动脚本
# 解决编译缓慢和目录管理问题

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 切换到项目目录
cd "$PROJECT_DIR"

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：未找到 package.json 文件"
    echo "请确保在正确的项目目录中运行此脚本"
    exit 1
fi

echo "🚀 OpenAero 优化开发服务器"
echo "================================"
echo "📁 项目目录: $PROJECT_DIR"

# 清理缓存
echo "🧹 清理缓存..."
rm -rf .next
rm -rf node_modules/.cache

# 设置环境变量优化
export NODE_OPTIONS="--max-old-space-size=4096"
export NEXT_TELEMETRY_DISABLED=1

# 启动开发服务器
echo "🚀 启动优化开发服务器..."
echo "💡 提示：首次启动可能需要较长时间，后续会更快"
echo ""

npm run dev

#!/bin/bash

# OpenAero 开发服务器启动脚本
# 确保在正确的项目目录中运行

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

echo "📁 项目目录: $PROJECT_DIR"
echo "🚀 启动开发服务器..."

# 启动开发服务器
npm run dev

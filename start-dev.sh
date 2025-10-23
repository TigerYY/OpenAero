#!/bin/bash

# OpenAero 标准化开发环境启动脚本
# 确保在正确的项目目录下启动开发服务器

set -e  # 遇到错误立即退出

# 获取脚本所在目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

echo "🚀 OpenAero 开发环境启动脚本"
echo "📁 项目目录: $PROJECT_ROOT"

# 切换到项目目录
cd "$PROJECT_ROOT"

# 验证必要文件存在
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 未找到 package.json，请确保在正确的项目目录下运行"
    exit 1
fi

if [ ! -f "scripts/clean-ports.js" ]; then
    echo "❌ 错误: 未找到 scripts/clean-ports.js"
    exit 1
fi

echo "✅ 项目目录验证通过"

# 使用标准化启动脚本
echo "🚀 启动开发服务器（标准化版本）..."
node scripts/start-dev.js
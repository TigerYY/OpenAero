#!/bin/bash

# OpenAero 环境检查脚本
# 确保开发环境配置正确

set -e

echo "🔍 OpenAero 环境检查"
echo "========================"

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📁 项目根目录: $PROJECT_ROOT"
echo "📁 当前工作目录: $(pwd)"

# 检查是否在正确的目录
if [ "$(pwd)" != "$PROJECT_ROOT" ]; then
    echo "⚠️  警告: 当前不在项目根目录"
    echo "🔄 切换到项目根目录..."
    cd "$PROJECT_ROOT"
    echo "✅ 已切换到: $(pwd)"
fi

# 检查必要文件
echo ""
echo "📋 检查必要文件:"

files=("package.json" "next.config.js" "tsconfig.json" "scripts/clean-ports.js")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (缺失)"
        exit 1
    fi
done

# 检查Node.js和npm版本
echo ""
echo "🔧 检查开发工具:"

if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node -v)
    echo "  ✅ Node.js: $NODE_VERSION"
else
    echo "  ❌ Node.js 未安装"
    exit 1
fi

if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm -v)
    echo "  ✅ npm: $NPM_VERSION"
else
    echo "  ❌ npm 未安装"
    exit 1
fi

# 检查依赖
echo ""
echo "📦 检查依赖:"
if [ -d "node_modules" ]; then
    echo "  ✅ node_modules 存在"
else
    echo "  ⚠️  node_modules 不存在，运行 npm install..."
    npm install
fi

echo ""
echo "🎉 环境检查完成！"
echo "💡 使用 './start-dev.sh' 启动开发服务器"

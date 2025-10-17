#!/bin/bash

# OpenAero 项目健康检查脚本

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 切换到项目目录
cd "$PROJECT_DIR"

echo "🔍 OpenAero 项目健康检查"
echo "================================"

# 检查项目目录
echo "📁 当前目录: $(pwd)"
if [ ! -f "package.json" ]; then
    echo "❌ 错误：未找到 package.json 文件"
    exit 1
fi
echo "✅ 项目目录正确"

# 检查关键文件
echo ""
echo "📋 检查关键文件:"
files=("next.config.js" "tailwind.config.js" "tsconfig.json" "postcss.config.js" "src/app/layout.tsx")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file 缺失"
    fi
done

# 检查依赖
echo ""
echo "📦 检查依赖:"
if [ -d "node_modules" ]; then
    echo "✅ node_modules 存在"
else
    echo "⚠️  node_modules 不存在，需要运行 npm install"
fi

# 检查端口占用
echo ""
echo "🌐 检查端口占用:"
if lsof -i :3000 >/dev/null 2>&1; then
    echo "⚠️  端口 3000 已被占用"
    echo "占用进程:"
    lsof -i :3000
else
    echo "✅ 端口 3000 可用"
fi

# 检查环境变量
echo ""
echo "🔧 检查环境变量:"
if [ -f ".env.local" ]; then
    echo "✅ .env.local 存在"
else
    echo "⚠️  .env.local 不存在，请复制 env.example 并配置"
fi

echo ""
echo "🎯 建议操作:"
echo "1. 运行 npm install 安装依赖"
echo "2. 复制 env.example 到 .env.local 并配置"
echo "3. 运行 npm run dev 启动开发服务器"

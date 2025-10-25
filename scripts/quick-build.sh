#!/bin/bash

# 快速构建脚本 - 优化构建性能
echo "🚀 开始快速构建..."

# 设置环境变量
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1
export SKIP_ENV_VALIDATION=true

# 清理缓存
echo "🧹 清理缓存..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf out

# 设置构建优化环境变量
export NEXT_PRIVATE_SKIP_SIZE_LIMIT=1
export NEXT_PRIVATE_SKIP_MEMORY_LIMIT=1

# 开始构建
echo "⚡ 开始构建..."
time npm run build

echo "✅ 构建完成！"

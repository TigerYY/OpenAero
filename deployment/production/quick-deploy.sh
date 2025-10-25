#!/bin/bash

# OpenAero 快速部署脚本
# 使用方法: ./quick-deploy.sh

set -e

echo "🚀 开始快速部署 OpenAero..."

# 1. 上传部署脚本到服务器
echo "📤 上传部署脚本到服务器..."
scp deployment/production/deploy.sh root@openaero.cn:/tmp/

# 2. 在服务器上执行部署
echo "🔧 在服务器上执行部署..."
ssh root@openaero.cn "chmod +x /tmp/deploy.sh && /tmp/deploy.sh latest"

echo "✅ 部署完成！"
echo "🌐 访问地址: https://openaero.cn"
echo "🔍 健康检查: https://openaero.cn/health"

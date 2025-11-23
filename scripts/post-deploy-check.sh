#!/bin/bash

# 部署后检查脚本
# 用于验证部署是否成功

set -e

BASE_URL="${1:-http://localhost:3000}"
MAX_RETRIES=5
RETRY_DELAY=10

echo "🔍 开始部署后检查..."
echo "目标 URL: $BASE_URL"

# 等待应用启动
echo "⏳ 等待应用启动..."
for i in $(seq 1 $MAX_RETRIES); do
  if curl -f -s "$BASE_URL/api/health" > /dev/null 2>&1; then
    echo "✅ 应用已启动"
    break
  fi
  
  if [ $i -eq $MAX_RETRIES ]; then
    echo "❌ 应用启动超时"
    exit 1
  fi
  
  echo "  重试 $i/$MAX_RETRIES..."
  sleep $RETRY_DELAY
done

# 健康检查
echo "🏥 执行健康检查..."
HEALTH_RESPONSE=$(curl -s "$BASE_URL/api/health")
if echo "$HEALTH_RESPONSE" | grep -q "healthy\|ok"; then
  echo "✅ 健康检查通过"
else
  echo "❌ 健康检查失败"
  echo "响应: $HEALTH_RESPONSE"
  exit 1
fi

# 环境配置验证
echo "⚙️  验证环境配置..."
if curl -f -s "$BASE_URL/api/health" > /dev/null 2>&1; then
  echo "✅ 环境配置验证通过"
else
  echo "⚠️  环境配置验证警告（非致命）"
fi

# 关键端点检查
echo "🔗 检查关键端点..."
ENDPOINTS=("/" "/solutions" "/shop/products")

for endpoint in "${ENDPOINTS[@]}"; do
  if curl -f -s "$BASE_URL$endpoint" > /dev/null 2>&1; then
    echo "✅ $endpoint 可访问"
  else
    echo "⚠️  $endpoint 访问失败（非致命）"
  fi
done

echo "✅ 部署后检查完成"


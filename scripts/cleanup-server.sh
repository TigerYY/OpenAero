#!/bin/bash
# 清理服务器上的 Docker 资源

set -e

echo "开始清理服务器 Docker 资源..."

# 停止所有容器
echo "停止所有容器..."
docker compose -f docker-compose.supabase.yml down 2>/dev/null || true
docker compose -f docker-compose.production.yml down 2>/dev/null || true
docker compose down 2>/dev/null || true

# 删除所有停止的容器
echo "删除停止的容器..."
docker container prune -f

# 删除所有未使用的镜像（包括悬空镜像）
echo "删除未使用的镜像..."
docker image prune -a -f

# 删除所有未使用的卷
echo "删除未使用的卷..."
docker volume prune -f

# 清理构建缓存
echo "清理构建缓存..."
docker builder prune -a -f

# 显示清理后的空间使用情况
echo ""
echo "清理完成！当前 Docker 空间使用情况："
docker system df


#!/bin/bash
# 在服务器上拉取镜像并部署

set -e

IMAGE_NAME="${IMAGE_NAME:-openaero-web:latest}"
REGISTRY="${DOCKER_REGISTRY:-}"
REGISTRY_USER="${DOCKER_USERNAME:-}"

# 构建完整的镜像名
if [ -n "$REGISTRY_USER" ] && [ -n "$REGISTRY" ]; then
    FULL_IMAGE_NAME="${REGISTRY}/${REGISTRY_USER}/openaero-web:latest"
else
    FULL_IMAGE_NAME="${IMAGE_NAME}"
fi

echo "部署配置："
echo "  镜像: ${FULL_IMAGE_NAME}"
echo "  工作目录: /opt/openaero"
echo ""

# 拉取镜像（如果使用 Registry）
if [ -n "$REGISTRY_USER" ] && [ -n "$REGISTRY" ]; then
    echo "从 Registry 拉取镜像..."
    docker pull "${FULL_IMAGE_NAME}" || {
        echo "警告: 无法从 Registry 拉取镜像，将使用本地镜像"
    }
    
    # 标记镜像为本地名
    docker tag "${FULL_IMAGE_NAME}" "${IMAGE_NAME}" || true
fi

# 进入工作目录
cd /opt/openaero

# 更新代码（如果需要）
if [ -d ".git" ]; then
    echo "更新代码..."
    git pull || echo "警告: Git pull 失败，继续使用当前代码"
fi

# 停止现有服务
echo "停止现有服务..."
docker compose -f docker-compose.supabase.yml down || true

# 启动服务
echo "启动服务..."
docker compose -f docker-compose.supabase.yml up -d

# 等待服务启动
echo "等待服务启动..."
sleep 10

# 检查服务状态
echo ""
echo "服务状态："
docker compose -f docker-compose.supabase.yml ps

# 检查健康状态
echo ""
echo "检查应用健康状态..."
for i in {1..30}; do
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        echo "✅ 应用健康检查通过！"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ 应用健康检查失败"
        echo "查看日志: docker compose -f docker-compose.supabase.yml logs app"
        exit 1
    fi
    echo "等待应用启动... ($i/30)"
    sleep 2
done

echo ""
echo "部署完成！"
echo "查看日志: docker compose -f docker-compose.supabase.yml logs -f"


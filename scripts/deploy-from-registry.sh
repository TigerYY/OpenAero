#!/bin/bash
# 从容器注册表部署应用
# 使用 GitHub Container Registry (ghcr.io)

set -e

# 配置
REGISTRY="${DOCKER_REGISTRY:-ghcr.io}"
IMAGE_NAME="${DOCKER_IMAGE_NAME:-openaero-web}"
VERSION="${VERSION:-latest}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.supabase.yml}"

# 完整的镜像名称
FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${VERSION}"

echo "=========================================="
echo "从容器注册表部署应用"
echo "=========================================="
echo "镜像: ${FULL_IMAGE_NAME}"
echo "Compose 文件: ${COMPOSE_FILE}"
echo ""

# 检查 Docker 是否运行
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker daemon 未运行，请先启动 Docker"
    exit 1
fi

# 检查是否已登录到注册表（如果需要）
if [[ "$REGISTRY" == "ghcr.io" ]]; then
    echo "📋 检查 GitHub Container Registry 登录状态..."
    if ! docker pull "${FULL_IMAGE_NAME}" >/dev/null 2>&1; then
        echo "⚠️  无法拉取镜像，可能需要登录"
        echo "   请运行: echo \$GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin"
        echo "   或设置环境变量: export GITHUB_TOKEN=your_token"
    fi
fi

echo ""
echo "=========================================="
echo "步骤 1: 拉取最新镜像"
echo "=========================================="

# 拉取镜像
echo "拉取镜像: ${FULL_IMAGE_NAME}"
if docker pull "${FULL_IMAGE_NAME}"; then
    echo "✅ 镜像拉取成功"
    
    # 标记为 latest（如果需要）
    if [ "$VERSION" != "latest" ]; then
        docker tag "${FULL_IMAGE_NAME}" "${REGISTRY}/${IMAGE_NAME}:latest"
        echo "✅ 已标记为 latest"
    fi
else
    echo "❌ 镜像拉取失败"
    exit 1
fi

echo ""
echo "=========================================="
echo "步骤 2: 停止现有服务"
echo "=========================================="

# 停止现有服务
if docker compose -f "${COMPOSE_FILE}" ps -q >/dev/null 2>&1; then
    echo "停止现有服务..."
    docker compose -f "${COMPOSE_FILE}" down
    echo "✅ 服务已停止"
else
    echo "ℹ️  没有运行中的服务"
fi

echo ""
echo "=========================================="
echo "步骤 3: 更新 Compose 配置"
echo "=========================================="

# 更新环境变量以使用注册表镜像
export IMAGE_NAME="${FULL_IMAGE_NAME}"

echo "✅ 使用镜像: ${FULL_IMAGE_NAME}"

echo ""
echo "=========================================="
echo "步骤 4: 启动服务"
echo "=========================================="

# 启动服务
echo "启动服务..."
docker compose -f "${COMPOSE_FILE}" up -d

echo ""
echo "=========================================="
echo "步骤 5: 等待服务就绪"
echo "=========================================="

# 等待服务启动
echo "等待服务启动..."
sleep 5

# 检查服务状态
echo ""
echo "服务状态:"
docker compose -f "${COMPOSE_FILE}" ps

echo ""
echo "=========================================="
echo "步骤 6: 健康检查"
echo "=========================================="

# 健康检查
MAX_RETRIES=12
RETRY_DELAY=5
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f -s http://localhost:3000/api/health >/dev/null 2>&1; then
        echo "✅ 健康检查通过"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
        echo "  等待中... ($RETRY_COUNT/$MAX_RETRIES)"
        sleep $RETRY_DELAY
    else
        echo "⚠️  健康检查超时，但服务可能仍在启动中"
        echo "   请手动检查: curl http://localhost:3000/api/health"
    fi
done

echo ""
echo "=========================================="
echo "部署完成！"
echo "=========================================="
echo "镜像: ${FULL_IMAGE_NAME}"
echo ""
echo "查看日志:"
echo "  docker compose -f ${COMPOSE_FILE} logs -f app"
echo ""
echo "查看状态:"
echo "  docker compose -f ${COMPOSE_FILE} ps"
echo ""
echo "停止服务:"
echo "  docker compose -f ${COMPOSE_FILE} down"


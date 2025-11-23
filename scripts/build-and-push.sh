#!/bin/bash
# 本地构建 Docker 镜像并推送到 Registry

set -e

# 配置
IMAGE_NAME="openaero-web"
REGISTRY="${DOCKER_REGISTRY:-docker.io}"
REGISTRY_USER="${DOCKER_USERNAME:-}"
VERSION="${VERSION:-latest}"

# 如果没有指定用户名，使用本地镜像名
if [ -z "$REGISTRY_USER" ]; then
    FULL_IMAGE_NAME="${IMAGE_NAME}:${VERSION}"
    echo "使用本地镜像名: ${FULL_IMAGE_NAME}"
else
    FULL_IMAGE_NAME="${REGISTRY}/${REGISTRY_USER}/${IMAGE_NAME}:${VERSION}"
    echo "使用 Registry 镜像名: ${FULL_IMAGE_NAME}"
fi

echo "开始构建 Docker 镜像..."
echo "镜像名: ${FULL_IMAGE_NAME}"
echo ""

# 构建镜像
docker build \
    -f Dockerfile.production \
    -t "${FULL_IMAGE_NAME}" \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    .

echo ""
echo "构建完成！"

# 如果指定了 Registry 用户名，则推送镜像
if [ -n "$REGISTRY_USER" ]; then
    echo ""
    echo "推送镜像到 Registry..."
    
    # 检查是否已登录
    if ! docker info | grep -q "Username"; then
        echo "请先登录 Docker Registry:"
        echo "  docker login ${REGISTRY}"
        exit 1
    fi
    
    docker push "${FULL_IMAGE_NAME}"
    echo ""
    echo "推送完成！"
    echo "镜像地址: ${FULL_IMAGE_NAME}"
else
    echo ""
    echo "未指定 Registry，镜像仅保存在本地"
    echo "要推送到 Registry，请设置环境变量："
    echo "  export DOCKER_REGISTRY=docker.io"
    echo "  export DOCKER_USERNAME=your-username"
    echo "  docker login docker.io"
    echo "  $0"
fi

echo ""
echo "镜像信息:"
docker images "${IMAGE_NAME}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"


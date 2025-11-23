#!/bin/bash

# 在服务器上直接执行的完整部署脚本
# 使用方法: 在服务器上执行 bash deploy-server.sh

set -e

# 配置
IMAGE_TAG="${1:-test-20251123}"
FULL_IMAGE="ghcr.io/tigeryy/openaero-web:${IMAGE_TAG}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        容器注册表部署脚本                               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "镜像: $FULL_IMAGE"
echo ""

# 检查 GitHub Token
if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  GITHUB_TOKEN 未设置${NC}"
    echo "请输入 GitHub Token:"
    read -s GITHUB_TOKEN
    export GITHUB_TOKEN
    echo ""
fi

echo -e "${GREEN}=== 步骤 1: 登录 GitHub Container Registry ===${NC}"
if echo "$GITHUB_TOKEN" | docker login ghcr.io -u TigerYY --password-stdin; then
    echo -e "${GREEN}✅ 登录成功${NC}"
else
    echo -e "${RED}❌ 登录失败，请检查 Token${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=== 步骤 2: 拉取镜像 ===${NC}"
if docker pull "$FULL_IMAGE"; then
    echo -e "${GREEN}✅ 镜像拉取成功${NC}"
    docker images "$FULL_IMAGE" --format "   大小: {{.Size}}"
else
    echo -e "${RED}❌ 镜像拉取失败${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=== 步骤 3: 准备部署目录 ===${NC}"
if [ ! -d "/opt/openaero" ]; then
    echo "创建部署目录..."
    mkdir -p /opt/openaero
    cd /opt/openaero
    echo -e "${GREEN}✅ 目录已创建${NC}"
else
    cd /opt/openaero
    echo -e "${GREEN}✅ 目录已存在${NC}"
fi

echo ""
echo -e "${GREEN}=== 步骤 4: 停止旧容器 ===${NC}"
if docker ps -a | grep -q openaero-web; then
    echo "停止并删除旧容器..."
    docker stop openaero-web 2>/dev/null || true
    docker rm openaero-web 2>/dev/null || true
    echo -e "${GREEN}✅ 旧容器已清理${NC}"
else
    echo "没有找到旧容器"
fi

echo ""
echo -e "${GREEN}=== 步骤 5: 启动新容器 ===${NC}"
echo "启动容器: $FULL_IMAGE"

# 检查是否有 docker-compose.registry.yml
if [ -f "docker-compose.registry.yml" ]; then
    echo "使用 Docker Compose 启动..."
    export DOCKER_IMAGE="$FULL_IMAGE"
    docker compose -f docker-compose.registry.yml up -d
else
    echo "使用 Docker run 启动..."
    docker run -d \
        --name openaero-web \
        -p 3000:3000 \
        --restart unless-stopped \
        -e NODE_ENV=production \
        "$FULL_IMAGE"
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 容器启动成功${NC}"
else
    echo -e "${RED}❌ 容器启动失败${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=== 步骤 6: 检查容器状态 ===${NC}"
sleep 3
if docker ps | grep -q openaero-web; then
    echo -e "${GREEN}✅ 容器正在运行${NC}"
    echo ""
    docker ps | grep openaero-web | awk '{print "   容器 ID: " $1 "\n   状态: " $7 "\n   端口: " $NF}'
else
    echo -e "${RED}❌ 容器未运行${NC}"
    echo "查看日志:"
    docker logs openaero-web --tail 50
    exit 1
fi

echo ""
echo -e "${GREEN}=== 步骤 7: 健康检查 ===${NC}"
sleep 5
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 应用健康检查通过${NC}"
elif curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 应用可以访问（健康检查端点可能不存在）${NC}"
else
    echo -e "${YELLOW}⚠️  健康检查失败，但容器正在运行${NC}"
    echo "查看日志: docker logs openaero-web"
fi

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                   部署完成！                              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "镜像: $FULL_IMAGE"
echo ""
echo "常用命令:"
echo "  查看日志: docker logs -f openaero-web"
echo "  查看状态: docker ps | grep openaero-web"
echo "  停止容器: docker stop openaero-web"
echo "  重启容器: docker restart openaero-web"
echo ""


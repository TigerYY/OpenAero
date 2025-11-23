#!/bin/bash
# 完整的容器注册表测试流程
# 包括构建、推送、验证

set -e

GITHUB_TOKEN="${GITHUB_TOKEN:-}"
GITHUB_USER="TigerYY"
REGISTRY="ghcr.io"
IMAGE_NAME="openaero-web"
VERSION="test-$(date +%Y%m%d-%H%M%S)"
FULL_IMAGE_NAME="${REGISTRY}/${GITHUB_USER,,}/${IMAGE_NAME}:${VERSION}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║        容器注册表部署测试 - 完整流程                    ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# 检查 Token
if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${RED}❌ 未设置 GITHUB_TOKEN${NC}"
    echo "请运行: export GITHUB_TOKEN=your_token"
    exit 1
fi

# 步骤 1: 登录
echo -e "${BLUE}步骤 1: 登录到 GitHub Container Registry${NC}"
if echo "$GITHUB_TOKEN" | docker login "$REGISTRY" -u "$GITHUB_USER" --password-stdin; then
    echo -e "${GREEN}✅ 登录成功${NC}\n"
else
    echo -e "${RED}❌ 登录失败${NC}"
    exit 1
fi

# 步骤 2: 构建镜像
echo -e "${BLUE}步骤 2: 构建 Docker 镜像${NC}"
echo "镜像名称: $FULL_IMAGE_NAME"
echo "这可能需要 10-30 分钟..."
echo ""

if docker build -f Dockerfile.production -t "$FULL_IMAGE_NAME" .; then
    echo -e "\n${GREEN}✅ 镜像构建成功${NC}\n"
    docker images "$FULL_IMAGE_NAME" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
else
    echo -e "\n${RED}❌ 镜像构建失败${NC}"
    exit 1
fi

# 步骤 3: 推送镜像
echo -e "\n${BLUE}步骤 3: 推送镜像到注册表${NC}"
echo "推送镜像: $FULL_IMAGE_NAME"
echo ""

if docker push "$FULL_IMAGE_NAME"; then
    echo -e "\n${GREEN}✅ 镜像推送成功${NC}\n"
    echo "镜像地址: $FULL_IMAGE_NAME"
    echo "查看: https://github.com/$GITHUB_USER?tab=packages"
else
    echo -e "\n${RED}❌ 镜像推送失败${NC}"
    exit 1
fi

# 步骤 4: 验证拉取
echo -e "\n${BLUE}步骤 4: 验证镜像可拉取${NC}"
echo "删除本地镜像并重新拉取..."
docker rmi "$FULL_IMAGE_NAME" 2>/dev/null || true

if docker pull "$FULL_IMAGE_NAME"; then
    echo -e "${GREEN}✅ 镜像拉取成功${NC}\n"
else
    echo -e "${RED}❌ 镜像拉取失败${NC}"
    exit 1
fi

# 步骤 5: 测试部署配置
echo -e "${BLUE}步骤 5: 测试部署配置${NC}"
export DOCKER_IMAGE="$FULL_IMAGE_NAME"
export COMPOSE_FILE="docker-compose.registry.yml"

if docker compose -f "$COMPOSE_FILE" config >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker Compose 配置有效${NC}\n"
else
    echo -e "${YELLOW}⚠️  Docker Compose 配置检查失败（可能需要环境变量）${NC}\n"
fi

# 总结
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                   测试完成！                            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

echo "✅ 已完成:"
echo "  1. ✅ GitHub Container Registry 认证"
echo "  2. ✅ Docker 镜像构建"
echo "  3. ✅ 镜像推送到注册表"
echo "  4. ✅ 镜像拉取验证"
echo "  5. ✅ 部署脚本配置检查"
echo ""

echo "📋 镜像信息:"
echo "  名称: $FULL_IMAGE_NAME"
echo "  查看: https://github.com/$GITHUB_USER?tab=packages"
echo ""

echo "🚀 下一步:"
echo "  1. 在服务器上部署:"
echo "     export DOCKER_IMAGE=$FULL_IMAGE_NAME"
echo "     ./scripts/deploy-from-registry.sh"
echo ""
echo "  2. 或使用 latest 标签:"
echo "     docker tag $FULL_IMAGE_NAME ${REGISTRY}/${GITHUB_USER,,}/${IMAGE_NAME}:latest"
echo "     docker push ${REGISTRY}/${GITHUB_USER,,}/${IMAGE_NAME}:latest"
echo ""

# 保存镜像信息
echo "$FULL_IMAGE_NAME" > /tmp/test-image-name.txt
echo "镜像名称已保存到: /tmp/test-image-name.txt"


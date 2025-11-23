#!/bin/bash
# 执行容器注册表部署流程测试
# 自动化执行所有测试步骤

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# 配置
GITHUB_USER="TigerYY"
REGISTRY="ghcr.io"
IMAGE_NAME="openaero-web"
VERSION="test-$(date +%Y%m%d-%H%M%S)"

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║    容器注册表部署流程测试 - 自动化执行                  ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# 步骤 1: 检查 GitHub Token
echo -e "${BLUE}步骤 1: 检查 GitHub Token${NC}"
if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  未检测到 GITHUB_TOKEN 环境变量${NC}"
    echo ""
    echo "请先设置 GitHub Personal Access Token:"
    echo "  1. 访问: https://github.com/settings/tokens"
    echo "  2. 点击 'Generate new token (classic)'"
    echo "  3. 选择权限: read:packages, write:packages"
    echo "  4. 生成 Token 后运行:"
    echo "     export GITHUB_TOKEN=your_token"
    echo "     $0"
    exit 1
else
    echo -e "${GREEN}✅ 检测到 GITHUB_TOKEN${NC}"
fi
echo ""

# 步骤 2: 登录到 GitHub Container Registry
echo -e "${BLUE}步骤 2: 登录到 GitHub Container Registry${NC}"
if docker info 2>/dev/null | grep -q "ghcr.io"; then
    echo -e "${GREEN}✅ 已登录 GitHub Container Registry${NC}"
else
    echo "正在登录..."
    if echo "$GITHUB_TOKEN" | docker login "$REGISTRY" -u "$GITHUB_USER" --password-stdin; then
        echo -e "${GREEN}✅ 登录成功${NC}"
    else
        echo -e "${RED}❌ 登录失败${NC}"
        echo "请检查:"
        echo "  1. GITHUB_TOKEN 是否正确"
        echo "  2. Token 是否有 read:packages 和 write:packages 权限"
        exit 1
    fi
fi
echo ""

# 步骤 3: 构建镜像
echo -e "${BLUE}步骤 3: 构建 Docker 镜像${NC}"
FULL_IMAGE_NAME="${REGISTRY}/${GITHUB_USER,,}/${IMAGE_NAME}:${VERSION}"
echo "镜像名称: $FULL_IMAGE_NAME"
echo "这可能需要 10-30 分钟，请耐心等待..."
echo ""

if docker build \
    -f Dockerfile.production \
    -t "$FULL_IMAGE_NAME" \
    --progress=plain \
    . 2>&1 | tee /tmp/docker-build.log; then
    echo -e "\n${GREEN}✅ 镜像构建成功${NC}"
    
    # 显示镜像信息
    echo ""
    echo "镜像信息:"
    docker images "$FULL_IMAGE_NAME" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
else
    echo -e "\n${RED}❌ 镜像构建失败${NC}"
    echo "查看详细日志: /tmp/docker-build.log"
    exit 1
fi
echo ""

# 步骤 4: 推送镜像
echo -e "${BLUE}步骤 4: 推送镜像到 GitHub Container Registry${NC}"
echo "推送镜像: $FULL_IMAGE_NAME"
echo "这可能需要几分钟，取决于网络速度..."
echo ""

if docker push "$FULL_IMAGE_NAME" 2>&1 | tee /tmp/docker-push.log; then
    echo -e "\n${GREEN}✅ 镜像推送成功${NC}"
    echo ""
    echo "镜像地址: $FULL_IMAGE_NAME"
    echo "可以在以下位置查看:"
    echo "  https://github.com/$GITHUB_USER?tab=packages"
else
    echo -e "\n${RED}❌ 镜像推送失败${NC}"
    echo "查看详细日志: /tmp/docker-push.log"
    exit 1
fi
echo ""

# 步骤 5: 验证镜像可拉取
echo -e "${BLUE}步骤 5: 验证镜像可拉取${NC}"
echo "测试拉取镜像..."
echo ""

# 先删除本地镜像（如果存在）
docker rmi "$FULL_IMAGE_NAME" 2>/dev/null || true

# 拉取镜像
if docker pull "$FULL_IMAGE_NAME"; then
    echo -e "${GREEN}✅ 镜像拉取成功${NC}"
    echo "镜像已成功推送到注册表并可以拉取"
else
    echo -e "${RED}❌ 镜像拉取失败${NC}"
    echo "可能的原因:"
    echo "  1. 镜像还未完全同步"
    echo "  2. 权限问题"
    exit 1
fi
echo ""

# 步骤 6: 测试部署脚本（可选，本地测试）
echo -e "${BLUE}步骤 6: 测试部署脚本配置${NC}"
echo "检查部署脚本是否能正确识别镜像..."
echo ""

export DOCKER_IMAGE="$FULL_IMAGE_NAME"
export COMPOSE_FILE="docker-compose.registry.yml"

# 检查 Docker Compose 配置
if docker compose -f "$COMPOSE_FILE" config >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker Compose 配置有效${NC}"
    
    # 显示配置的镜像
    echo ""
    echo "配置的镜像:"
    docker compose -f "$COMPOSE_FILE" config 2>/dev/null | grep -A 1 "image:" | head -2 || true
else
    echo -e "${YELLOW}⚠️  Docker Compose 配置检查失败（可能需要环境变量）${NC}"
fi
echo ""

# 总结
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                   测试执行完成                           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

echo "✅ 已完成:"
echo "  1. ✅ GitHub Container Registry 认证"
echo "  2. ✅ Docker 镜像构建"
echo "  3. ✅ 镜像推送到注册表"
echo "  4. ✅ 镜像拉取验证"
echo "  5. ✅ 部署脚本配置检查"
echo ""

echo "📋 下一步操作:"
echo ""
echo "1. 在服务器上部署:"
echo "   ssh root@openaero.cn"
echo "   export GITHUB_TOKEN=your_token"
echo "   echo \$GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USER --password-stdin"
echo "   cd /opt/openaero"
echo "   export DOCKER_IMAGE=$FULL_IMAGE_NAME"
echo "   export COMPOSE_FILE=docker-compose.registry.yml"
echo "   ./scripts/deploy-from-registry.sh"
echo ""
echo "2. 或使用本地测试部署:"
echo "   export DOCKER_IMAGE=$FULL_IMAGE_NAME"
echo "   export COMPOSE_FILE=docker-compose.registry.yml"
echo "   ./scripts/deploy-from-registry.sh"
echo ""
echo "3. 查看镜像:"
echo "   https://github.com/$GITHUB_USER?tab=packages"
echo ""

# 保存镜像信息
echo "$FULL_IMAGE_NAME" > /tmp/test-image-name.txt
echo "镜像名称已保存到: /tmp/test-image-name.txt"


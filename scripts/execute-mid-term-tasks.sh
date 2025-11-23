#!/bin/bash

# 执行中期任务的完整脚本
# 包括：验证构建、推送镜像、执行中期任务

set -e

# 配置
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
IMAGE_TAG="${1:-}"
REGISTRY="ghcr.io"
IMAGE_NAME="tigeryy/openaero-web"
FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        执行中期任务流程                                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# 如果没有提供镜像标签，查找最新的优化镜像
if [ -z "$IMAGE_TAG" ]; then
    IMAGE_TAG=$(docker images --format "{{.Tag}}" openaero-web:optimized-* 2>/dev/null | head -1)
    if [ -z "$IMAGE_TAG" ]; then
        echo -e "${RED}❌ 未找到优化后的镜像${NC}"
        echo "请先构建镜像或提供镜像标签"
        exit 1
    fi
    echo -e "${YELLOW}⚠️  使用找到的镜像标签: $IMAGE_TAG${NC}"
fi

FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "镜像: openaero-web:$IMAGE_TAG"
echo "完整名称: $FULL_IMAGE"
echo ""

# 检查 GitHub Token
if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  GITHUB_TOKEN 未设置${NC}"
    echo "请输入 GitHub Token:"
    read -s GITHUB_TOKEN
    export GITHUB_TOKEN
fi

# 步骤 3: 验证构建成功
echo -e "${GREEN}=== 步骤 3: 验证构建成功 ===${NC}"
if docker images | grep -q "openaero-web:$IMAGE_TAG"; then
    echo -e "${GREEN}✅ 镜像存在${NC}"
    docker images "openaero-web:$IMAGE_TAG" --format "   大小: {{.Size}}\n   创建时间: {{.CreatedAt}}"
    
    # 验证镜像完整性
    echo ""
    echo "验证镜像完整性..."
    if docker inspect "openaero-web:$IMAGE_TAG" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 镜像完整性验证通过${NC}"
    else
        echo -e "${RED}❌ 镜像验证失败${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ 镜像不存在${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=== 步骤 4: 推送镜像到注册表 ===${NC}"

# 登录到注册表
echo "登录到 GitHub Container Registry..."
if echo "$GITHUB_TOKEN" | docker login "$REGISTRY" -u TigerYY --password-stdin > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 登录成功${NC}"
else
    echo -e "${RED}❌ 登录失败${NC}"
    exit 1
fi

# 标记镜像
echo ""
echo "标记镜像: $FULL_IMAGE"
docker tag "openaero-web:$IMAGE_TAG" "$FULL_IMAGE"
echo -e "${GREEN}✅ 镜像已标记${NC}"

# 推送镜像
echo ""
echo "推送镜像到注册表（这可能需要几分钟）..."
if docker push "$FULL_IMAGE"; then
    echo -e "${GREEN}✅ 镜像推送成功${NC}"
    echo ""
    echo "镜像信息:"
    echo "  完整名称: $FULL_IMAGE"
    echo "  查看: https://github.com/TigerYY?tab=packages"
else
    echo -e "${RED}❌ 镜像推送失败${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=== 步骤 5: 准备执行中期任务 ===${NC}"
echo ""
echo "中期任务清单:"
echo "  1. ✅ 迁移到容器注册表（已完成基础工作）"
echo "  2. ⏳ 实施蓝绿部署（待执行）"
echo "  3. ⏳ 添加监控和告警（待执行）"
echo ""
echo -e "${YELLOW}💡 提示:${NC}"
echo "  镜像已推送到注册表，可以开始执行中期任务"
echo "  使用以下命令在服务器上部署:"
echo ""
echo "  export GITHUB_TOKEN=your_token"
echo "  export DOCKER_IMAGE=$FULL_IMAGE"
echo "  ./scripts/deploy-from-registry.sh"
echo ""

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                   步骤 1-4 完成！                        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "下一步: 执行中期任务"
echo "  1. 在服务器上部署新镜像"
echo "  2. 实施蓝绿部署策略"
echo "  3. 添加监控和告警"


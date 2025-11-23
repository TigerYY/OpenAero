#!/bin/bash

# 通过 SSH 在服务器上执行容器注册表部署
# 使用方法: ./scripts/deploy-via-ssh.sh [服务器地址] [镜像标签]

set -e

# 配置
SERVER="${1:-root@openaero.cn}"
IMAGE_TAG="${2:-test-20251123}"
FULL_IMAGE="ghcr.io/tigeryy/openaero-web:${IMAGE_TAG}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== 通过 SSH 部署到服务器 ===${NC}"
echo ""
echo "服务器: $SERVER"
echo "镜像: $FULL_IMAGE"
echo ""

# 检查 GitHub Token
if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  GITHUB_TOKEN 未设置${NC}"
    echo "请输入 GitHub Token:"
    read -s GITHUB_TOKEN
    export GITHUB_TOKEN
fi

# 在服务器上执行的命令
DEPLOY_COMMANDS=$(cat <<EOF
set -e

echo "=== 1. 登录 GitHub Container Registry ==="
echo "\$GITHUB_TOKEN" | docker login ghcr.io -u TigerYY --password-stdin || {
    echo "❌ 登录失败，请检查 Token"
    exit 1
}

echo ""
echo "=== 2. 拉取镜像 ==="
docker pull $FULL_IMAGE || {
    echo "❌ 拉取镜像失败"
    exit 1
}

echo ""
echo "=== 3. 检查部署目录 ==="
if [ ! -d "/opt/openaero" ]; then
    echo "创建部署目录..."
    mkdir -p /opt/openaero
    cd /opt/openaero
else
    cd /opt/openaero
fi

echo ""
echo "=== 4. 设置环境变量 ==="
export DOCKER_IMAGE=$FULL_IMAGE
export COMPOSE_FILE=docker-compose.registry.yml

echo ""
echo "=== 5. 验证 Docker Compose 配置 ==="
if [ -f "docker-compose.registry.yml" ]; then
    docker compose -f docker-compose.registry.yml config > /dev/null || {
        echo "❌ Docker Compose 配置无效"
        exit 1
    }
    echo "✅ 配置有效"
else
    echo "⚠️  docker-compose.registry.yml 不存在，将使用默认配置"
fi

echo ""
echo "=== 6. 停止旧容器 ==="
if [ -f "docker-compose.registry.yml" ]; then
    docker compose -f docker-compose.registry.yml down || true
else
    docker stop openaero-web 2>/dev/null || true
    docker rm openaero-web 2>/dev/null || true
fi

echo ""
echo "=== 7. 启动新容器 ==="
if [ -f "docker-compose.registry.yml" ]; then
    docker compose -f docker-compose.registry.yml up -d
else
    docker run -d \\
        --name openaero-web \\
        -p 3000:3000 \\
        --restart unless-stopped \\
        $FULL_IMAGE
fi

echo ""
echo "=== 8. 检查容器状态 ==="
sleep 3
docker ps | grep openaero-web || {
    echo "❌ 容器未运行"
    docker logs openaero-web --tail 50
    exit 1
}

echo ""
echo "=== 9. 健康检查 ==="
sleep 5
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ 应用健康检查通过"
else
    echo "⚠️  健康检查失败，但容器正在运行"
    echo "查看日志: docker logs openaero-web"
fi

echo ""
echo "✅ 部署完成！"
echo "镜像: $FULL_IMAGE"
echo "查看日志: docker logs -f openaero-web"
EOF
)

# 通过 SSH 执行部署
echo -e "${GREEN}开始部署...${NC}"
echo ""

ssh "$SERVER" bash <<EOF
export GITHUB_TOKEN="$GITHUB_TOKEN"
$DEPLOY_COMMANDS
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ 部署成功完成！${NC}"
    echo ""
    echo "服务器地址: $SERVER"
    echo "镜像: $FULL_IMAGE"
    echo ""
    echo "后续操作:"
    echo "  ssh $SERVER 'docker logs -f openaero-web'"
    echo "  ssh $SERVER 'docker ps | grep openaero-web'"
else
    echo ""
    echo -e "${RED}❌ 部署失败${NC}"
    exit 1
fi


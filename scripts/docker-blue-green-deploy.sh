#!/bin/bash

# Docker 蓝绿部署脚本
# 使用方法: ./scripts/docker-blue-green-deploy.sh [blue|green] [镜像标签]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️${NC} $1"
}

# 配置
CURRENT_ENV="${1:-blue}"
IMAGE_TAG="${2:-latest}"
APP_DIR="/opt/openaero-web"
COMPOSE_FILE="docker-compose.blue-green.yml"

# 确定目标环境
if [ "$CURRENT_ENV" = "blue" ]; then
    TARGET_ENV="green"
    TARGET_CONTAINER="openaero-app-green"
    TARGET_PORT=3001
    CURRENT_CONTAINER="openaero-app-blue"
    CURRENT_PORT=3000
else
    TARGET_ENV="blue"
    TARGET_CONTAINER="openaero-app-blue"
    TARGET_PORT=3000
    CURRENT_CONTAINER="openaero-app-green"
    CURRENT_PORT=3001
fi

log "🚀 开始 Docker 蓝绿部署..."
log "当前环境: $CURRENT_ENV (容器: $CURRENT_CONTAINER, 端口: $CURRENT_PORT)"
log "目标环境: $TARGET_ENV (容器: $TARGET_CONTAINER, 端口: $TARGET_PORT)"
log "镜像标签: $IMAGE_TAG"

# 检查 Docker 和 Docker Compose
if ! command -v docker &> /dev/null; then
    error "Docker 未安装"
fi

if ! command -v docker compose &> /dev/null; then
    error "Docker Compose 未安装"
fi

# 进入应用目录
cd "$APP_DIR" || error "无法进入应用目录: $APP_DIR"

# 1. 检查镜像是否存在
log "📦 检查镜像..."
if ! docker images | grep -q "openaero-web.*$IMAGE_TAG"; then
    warning "镜像 openaero-web:$IMAGE_TAG 不存在"
    log "请先构建或拉取镜像"
    log "构建镜像: docker build -f Dockerfile.production -t openaero-web:$IMAGE_TAG ."
    log "或拉取镜像: docker pull <registry>/openaero-web:$IMAGE_TAG"
    error "镜像不存在"
fi
success "镜像检查通过"

# 2. 更新 docker-compose 文件中的镜像标签
log "📝 更新 docker-compose 配置..."
sed -i.bak "s|image: openaero-web:.*|image: openaero-web:$IMAGE_TAG|g" "$COMPOSE_FILE"
success "配置已更新"

# 3. 启动目标环境（如果未运行）
log "🚀 启动 $TARGET_ENV 环境..."
if docker ps -a | grep -q "$TARGET_CONTAINER"; then
    log "容器 $TARGET_CONTAINER 已存在，先停止并删除..."
    docker stop "$TARGET_CONTAINER" 2>/dev/null || true
    docker rm "$TARGET_CONTAINER" 2>/dev/null || true
fi

# 使用 docker compose 启动目标环境
docker compose -f "$COMPOSE_FILE" --profile "$TARGET_ENV" up -d "$TARGET_CONTAINER"
success "$TARGET_ENV 环境已启动"

# 4. 等待目标环境就绪
log "⏳ 等待 $TARGET_ENV 环境就绪..."
for i in {1..60}; do
    if docker exec "$TARGET_CONTAINER" wget --no-verbose --tries=1 --spider http://localhost:3000/api/health 2>/dev/null; then
        success "$TARGET_ENV 环境健康检查通过"
        break
    fi
    if [ $i -eq 60 ]; then
        error "$TARGET_ENV 环境健康检查失败，请检查日志: docker logs $TARGET_CONTAINER"
    fi
    sleep 2
done

# 5. 更新 Nginx 配置切换流量
log "🔄 切换流量到 $TARGET_ENV 环境..."

# 更新 Nginx 配置
NGINX_CONF="$APP_DIR/nginx/blue-green.conf"
if [ ! -f "$NGINX_CONF" ]; then
    error "Nginx 配置文件不存在: $NGINX_CONF"
fi

# 备份配置
cp "$NGINX_CONF" "$NGINX_CONF.bak.$(date +%Y%m%d_%H%M%S)"

# 更新 upstream 配置
if [ "$TARGET_ENV" = "green" ]; then
    # 切换到 Green
    sed -i 's/server app-blue:3000 weight=1/server app-blue:3000 weight=0/' "$NGINX_CONF"
    sed -i 's/# server app-green:3000 weight=0/server app-green:3000 weight=1/' "$NGINX_CONF"
else
    # 切换到 Blue
    sed -i 's/server app-green:3000 weight=1/server app-green:3000 weight=0/' "$NGINX_CONF"
    sed -i 's/server app-blue:3000 weight=0/server app-blue:3000 weight=1/' "$NGINX_CONF"
fi

# 重载 Nginx
log "🔄 重载 Nginx..."
docker exec openaero-nginx nginx -t || error "Nginx 配置测试失败"
docker exec openaero-nginx nginx -s reload || error "Nginx 重载失败"
success "流量已切换到 $TARGET_ENV 环境"

# 6. 等待流量切换完成
log "⏳ 等待流量切换完成..."
sleep 5

# 7. 验证新环境
log "🔍 验证 $TARGET_ENV 环境..."
if curl -f http://localhost:$TARGET_PORT/api/health > /dev/null 2>&1; then
    success "$TARGET_ENV 环境验证通过"
else
    warning "$TARGET_ENV 环境验证失败，但流量已切换"
fi

# 8. 检查当前环境（保留用于快速回退）
log "📊 当前部署状态..."
log "生产环境: $TARGET_ENV (容器: $TARGET_CONTAINER, 端口: $TARGET_PORT)"
log "备用环境: $CURRENT_ENV (容器: $CURRENT_CONTAINER, 端口: $CURRENT_PORT)"
warning "备用环境 ($CURRENT_ENV) 已停止接收流量，但保留运行以便快速回退"
log "如需停止备用环境，运行: docker stop $CURRENT_CONTAINER"

success "🎉 Docker 蓝绿部署完成！"
log "当前生产环境: $TARGET_ENV"
log "查看日志: docker logs -f $TARGET_CONTAINER"
log "查看状态: docker ps | grep openaero-app"


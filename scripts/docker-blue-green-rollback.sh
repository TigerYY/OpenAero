#!/bin/bash

# Docker 蓝绿部署回退脚本
# 使用方法: ./scripts/docker-blue-green-rollback.sh

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

# 配置
APP_DIR="/opt/openaero-web"
NGINX_CONF="$APP_DIR/nginx/blue-green.conf"

log "🔄 开始回退..."

# 检查 Nginx 配置确定当前环境
if grep -q "server app-blue:3000 weight=1" "$NGINX_CONF"; then
    CURRENT_ENV="blue"
    ROLLBACK_ENV="green"
    ROLLBACK_CONTAINER="openaero-app-green"
    ROLLBACK_PORT=3001
elif grep -q "server app-green:3000 weight=1" "$NGINX_CONF"; then
    CURRENT_ENV="green"
    ROLLBACK_ENV="blue"
    ROLLBACK_CONTAINER="openaero-app-blue"
    ROLLBACK_PORT=3000
else
    error "无法确定当前环境"
fi

log "当前环境: $CURRENT_ENV"
log "回退到: $ROLLBACK_ENV"

# 检查回退环境是否运行
if ! docker ps | grep -q "$ROLLBACK_CONTAINER"; then
    error "回退环境 ($ROLLBACK_ENV) 未运行，无法回退"
fi

# 健康检查
log "🔍 检查回退环境健康状态..."
if ! docker exec "$ROLLBACK_CONTAINER" wget --no-verbose --tries=1 --spider http://localhost:3000/api/health 2>/dev/null; then
    error "回退环境 ($ROLLBACK_ENV) 健康检查失败"
fi
success "回退环境健康检查通过"

# 切换流量
log "🔄 切换流量到 $ROLLBACK_ENV 环境..."

# 备份配置
cp "$NGINX_CONF" "$NGINX_CONF.bak.rollback.$(date +%Y%m%d_%H%M%S)"

# 更新 upstream 配置
sed -i 's/server app-blue:3000 weight=1/server app-blue:3000 weight=0/' "$NGINX_CONF"
sed -i 's/server app-green:3000 weight=1/server app-green:3000 weight=0/' "$NGINX_CONF"

if [ "$ROLLBACK_ENV" = "blue" ]; then
    sed -i 's/server app-blue:3000 weight=0/server app-blue:3000 weight=1/' "$NGINX_CONF"
else
    sed -i 's/# server app-green:3000 weight=0/server app-green:3000 weight=1/' "$NGINX_CONF"
fi

# 重载 Nginx
docker exec openaero-nginx nginx -t || error "Nginx 配置测试失败"
docker exec openaero-nginx nginx -s reload || error "Nginx 重载失败"

success "✅ 已回退到 $ROLLBACK_ENV 环境"
log "当前生产环境: $ROLLBACK_ENV"
log "查看日志: docker logs -f $ROLLBACK_CONTAINER"


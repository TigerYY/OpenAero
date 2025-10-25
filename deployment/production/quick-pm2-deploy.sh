#!/bin/bash

# OpenAero 快速 PM2 部署脚本
# 从本地机器部署到 root@openaero.cn

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

SERVER_USER="root"
SERVER_HOST="openaero.cn"
REMOTE_DIR="/opt/openaero-web-deploy"
LOCAL_DEPLOY_DIR="./deployment/production"

log "🚀 开始快速 PM2 部署 OpenAero..."

# 确保本地部署脚本存在
if [ ! -d "$LOCAL_DEPLOY_DIR" ]; then
    error "本地部署脚本目录 $LOCAL_DEPLOY_DIR 不存在"
fi

# 确保远程目录存在并上传脚本
log "📤 上传部署脚本到服务器..."
ssh "$SERVER_USER@$SERVER_HOST" "mkdir -p $REMOTE_DIR"
scp -r "$LOCAL_DEPLOY_DIR" "$SERVER_USER@$SERVER_HOST:$REMOTE_DIR/"
success "部署脚本上传完成"

# 在远程服务器上执行部署脚本
log "🔧 在服务器上执行 PM2 部署..."
ssh "$SERVER_USER@$SERVER_HOST" "chmod +x $REMOTE_DIR/production/pm2-deploy.sh && $REMOTE_DIR/production/pm2-deploy.sh"

success "🎉 快速 PM2 部署命令执行完成！"
log "您可以通过以下命令管理应用："
log "  ssh $SERVER_USER@$SERVER_HOST 'pm2 status'"
log "  ssh $SERVER_USER@$SERVER_HOST 'pm2 logs openaero-web'"
log "  ssh $SERVER_USER@$SERVER_HOST 'pm2 restart openaero-web'"

# 错误处理
trap 'error "快速部署过程中发生错误，请检查日志"' ERR

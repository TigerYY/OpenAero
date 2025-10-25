#!/bin/bash

# OpenAero PM2 部署脚本
# 用于在 root@openaero.cn 上部署应用

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
APP_NAME="openaero-web"
APP_DIR="/opt/openaero-web"
BACKUP_DIR="/opt/openaero-web-backup"
NODE_VERSION="18"

log "🚀 开始 PM2 部署 OpenAero..."

# 检查Node.js版本
check_node() {
    log "检查 Node.js 版本..."
    if ! command -v node &> /dev/null; then
        error "Node.js 未安装，请先安装 Node.js $NODE_VERSION"
    fi
    
    NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VER" -lt "$NODE_VERSION" ]; then
        error "Node.js 版本过低，需要 $NODE_VERSION+，当前版本: $(node -v)"
    fi
    
    success "Node.js 版本检查通过: $(node -v)"
}

# 检查PM2
check_pm2() {
    log "检查 PM2..."
    if ! command -v pm2 &> /dev/null; then
        log "安装 PM2..."
        npm install -g pm2
    fi
    success "PM2 已安装: $(pm2 -v)"
}

# 备份现有应用
backup_app() {
    if [ -d "$APP_DIR" ]; then
        log "备份现有应用..."
        BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
        cp -r "$APP_DIR" "$BACKUP_DIR/$BACKUP_NAME"
        success "应用已备份到: $BACKUP_DIR/$BACKUP_NAME"
    fi
}

# 创建应用目录
create_app_dir() {
    log "创建应用目录..."
    mkdir -p "$APP_DIR"
    cd "$APP_DIR"
}

# 下载代码
download_code() {
    log "下载最新代码..."
    
    # 如果目录已存在，更新代码
    if [ -d ".git" ]; then
        log "更新现有代码..."
        git fetch origin
        git reset --hard origin/003-prd-document-enhancement
        git clean -fd
    else
        # 克隆代码
        git clone https://github.com/TigerYY/OpenAero.git .
        git checkout 003-prd-document-enhancement
    fi
    
    success "代码下载完成"
}

# 安装依赖
install_dependencies() {
    log "安装依赖..."
    npm ci --production
    success "依赖安装完成"
}

# 构建应用
build_app() {
    log "构建应用..."
    npm run build
    success "应用构建完成"
}

# 创建PM2配置文件
create_pm2_config() {
    log "创建 PM2 配置..."
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: 'npm',
    args: 'start',
    cwd: '$APP_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/$APP_NAME-error.log',
    out_file: '/var/log/pm2/$APP_NAME-out.log',
    log_file: '/var/log/pm2/$APP_NAME-combined.log',
    time: true
  }]
};
EOF
    success "PM2 配置创建完成"
}

# 创建环境变量文件
create_env_file() {
    log "创建环境变量文件..."
    if [ ! -f ".env.production" ]; then
        cat > .env.production << EOF
# Production Environment Variables
NODE_ENV=production
NEXTAUTH_URL=https://openaero.cn
NEXTAUTH_SECRET=your-secret-key-here
DATABASE_URL=your-database-url-here
EOF
        log "⚠️  请手动编辑 .env.production 文件，填入正确的配置值"
    fi
    success "环境变量文件创建完成"
}

# 停止现有应用
stop_app() {
    log "停止现有应用..."
    pm2 stop "$APP_NAME" 2>/dev/null || true
    pm2 delete "$APP_NAME" 2>/dev/null || true
    success "现有应用已停止"
}

# 启动应用
start_app() {
    log "启动应用..."
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
    success "应用启动完成"
}

# 检查应用状态
check_app_status() {
    log "检查应用状态..."
    sleep 5
    if pm2 list | grep -q "$APP_NAME.*online"; then
        success "应用运行正常"
        pm2 logs "$APP_NAME" --lines 10
    else
        error "应用启动失败"
    fi
}

# 配置Nginx
configure_nginx() {
    log "配置 Nginx..."
    cat > /etc/nginx/sites-available/openaero << EOF
server {
    listen 80;
    server_name openaero.cn www.openaero.cn;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    
    # 启用站点
    ln -sf /etc/nginx/sites-available/openaero /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx
    success "Nginx 配置完成"
}

# 健康检查
health_check() {
    log "执行健康检查..."
    sleep 10
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        success "健康检查通过"
    else
        error "健康检查失败"
    fi
}

# 主函数
main() {
    check_node
    check_pm2
    backup_app
    create_app_dir
    download_code
    install_dependencies
    build_app
    create_pm2_config
    create_env_file
    stop_app
    start_app
    check_app_status
    configure_nginx
    health_check
    
    success "🎉 PM2 部署完成！"
    log "应用运行在: http://localhost:3000"
    log "请访问: https://openaero.cn"
    log "查看日志: pm2 logs $APP_NAME"
    log "重启应用: pm2 restart $APP_NAME"
}

# 执行主函数
main "$@"

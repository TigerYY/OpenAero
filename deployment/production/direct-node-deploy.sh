#!/bin/bash

# OpenAero 直接 Node.js 部署脚本
# 用于在 root@openaero.cn 上直接部署 Node.js 应用

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
SERVICE_NAME="openaero-web"
BACKUP_DIR="/opt/openaero-web-backup"
NODE_VERSION="18"
USER="www-data"

log "🚀 开始直接 Node.js 部署 OpenAero..."

# 安装Node.js
install_nodejs() {
    log "安装 Node.js $NODE_VERSION..."
    
    if command -v node &> /dev/null; then
        NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VER" -ge "$NODE_VERSION" ]; then
            success "Node.js 已安装: $(node -v)"
            return
        fi
    fi
    
    # 安装 Node.js 18
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    apt-get install -y nodejs
    
    success "Node.js 安装完成: $(node -v)"
}

# 检查npm
check_npm() {
    log "检查 npm..."
    if ! command -v npm &> /dev/null; then
        error "npm 未安装"
    fi
    success "npm 已安装: $(npm -v)"
}

# 备份现有应用
backup_app() {
    if [ -d "$APP_DIR" ]; then
        log "备份现有应用..."
        BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
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

# 解压代码
extract_code() {
    log "解压代码..."
    if [ -f "/opt/openaero-web-deploy/openaero-code.tar.gz" ]; then
        tar -xzf /opt/openaero-web-deploy/openaero-code.tar.gz -C "$APP_DIR"
        success "代码解压完成"
    else
        error "代码包不存在: /opt/openaero-web-deploy/openaero-code.tar.gz"
    fi
}

# 安装依赖
install_dependencies() {
    log "安装依赖..."
    cd "$APP_DIR"
    npm ci --production
    success "依赖安装完成"
}

# 构建应用
build_app() {
    log "构建应用..."
    cd "$APP_DIR"
    npm run build
    success "应用构建完成"
}

# 创建环境变量文件
create_env_file() {
    log "创建环境变量文件..."
    cd "$APP_DIR"
    if [ ! -f ".env.production" ]; then
        cat > .env.production << 'ENVEOF'
# Production Environment Variables
NODE_ENV=production
NEXTAUTH_URL=https://openaero.cn
NEXTAUTH_SECRET=your-secret-key-here
DATABASE_URL=your-database-url-here
PORT=3000
ENVEOF
        log "⚠️  请手动编辑 .env.production 文件，填入正确的配置值"
    fi
    success "环境变量文件创建完成"
}

# 创建systemd服务
create_systemd_service() {
    log "创建 systemd 服务..."
    
    # 创建服务文件
    cat > /etc/systemd/system/$SERVICE_NAME.service << 'SERVICEEOF'
[Unit]
Description=OpenAero Web Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/openaero-web
Environment=NODE_ENV=production
EnvironmentFile=/opt/openaero-web/.env.production
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=openaero-web

[Install]
WantedBy=multi-user.target
SERVICEEOF

    # 创建用户（如果不存在）
    if ! id "$USER" &>/dev/null; then
        useradd -r -s /bin/false -d "$APP_DIR" "$USER"
    fi
    
    # 设置权限
    chown -R "$USER:$USER" "$APP_DIR"
    chmod +x "$APP_DIR/server.js" 2>/dev/null || true
    
    # 重载systemd
    systemctl daemon-reload
    success "systemd 服务创建完成"
}

# 停止现有服务
stop_service() {
    log "停止现有服务..."
    systemctl stop "$SERVICE_NAME" 2>/dev/null || true
    systemctl disable "$SERVICE_NAME" 2>/dev/null || true
    success "现有服务已停止"
}

# 启动服务
start_service() {
    log "启动服务..."
    systemctl enable "$SERVICE_NAME"
    systemctl start "$SERVICE_NAME"
    success "服务启动完成"
}

# 检查服务状态
check_service_status() {
    log "检查服务状态..."
    sleep 5
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        success "服务运行正常"
        systemctl status "$SERVICE_NAME" --no-pager -l
    else
        error "服务启动失败"
        systemctl status "$SERVICE_NAME" --no-pager -l
    fi
}

# 配置Nginx
configure_nginx() {
    log "配置 Nginx..."
    cat > /etc/nginx/sites-available/openaero << 'NGINXEOF'
server {
    listen 80;
    server_name openaero.cn www.openaero.cn;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXEOF
    
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

# 创建管理脚本
create_management_scripts() {
    log "创建管理脚本..."
    
    # 创建重启脚本
    cat > /usr/local/bin/openaero-restart << 'RESTARTEOF'
#!/bin/bash
systemctl restart openaero-web
echo "OpenAero 服务已重启"
RESTARTEOF
    
    # 创建日志查看脚本
    cat > /usr/local/bin/openaero-logs << 'LOGSEOF'
#!/bin/bash
journalctl -u openaero-web -f
LOGSEOF
    
    # 创建状态查看脚本
    cat > /usr/local/bin/openaero-status << 'STATUSEOF'
#!/bin/bash
systemctl status openaero-web
STATUSEOF
    
    chmod +x /usr/local/bin/openaero-*
    success "管理脚本创建完成"
}

# 主函数
main() {
    install_nodejs
    check_npm
    backup_app
    create_app_dir
    extract_code
    install_dependencies
    build_app
    create_env_file
    create_systemd_service
    stop_service
    start_service
    check_service_status
    configure_nginx
    health_check
    create_management_scripts
    
    success "🎉 直接 Node.js 部署完成！"
    log "应用运行在: http://localhost:3000"
    log "请访问: https://openaero.cn"
    log "管理命令:"
    log "  查看状态: openaero-status"
    log "  查看日志: openaero-logs"
    log "  重启服务: openaero-restart"
    log "  系统命令: systemctl status openaero-web"
}

# 执行主函数
main "$@"

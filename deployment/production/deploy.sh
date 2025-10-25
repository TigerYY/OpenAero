#!/bin/bash

# OpenAero Docker 生产环境部署脚本
# 使用方法: ./deploy.sh [version]

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

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌${NC} $1"
    exit 1
}

# 配置变量
VERSION=${1:-latest}
APP_NAME="openaero-web"
APP_DIR="/opt/openaero-web"
DOCKER_IMAGE="openaero-web:$VERSION"
CONTAINER_NAME="openaero-web"
NGINX_CONFIG="/etc/nginx/sites-available/openaero"
BACKUP_DIR="/opt/backup/openaero"

log "🚀 开始部署 OpenAero 到生产环境 (版本: $VERSION)"

# 检查Docker是否安装
check_docker() {
    log "检查Docker环境..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker 未安装，请先安装Docker"
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker 服务未运行，请启动Docker服务"
    fi
    
    success "Docker 环境检查通过"
}

# 创建备份
create_backup() {
    log "创建当前版本备份..."
    
    mkdir -p $BACKUP_DIR
    BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    if [ -d "$APP_DIR" ]; then
        tar -czf "$BACKUP_FILE" -C "$APP_DIR" .
        success "备份已创建: $BACKUP_FILE"
    else
        warning "应用目录不存在，跳过备份"
    fi
}

# 准备应用目录
prepare_app_directory() {
    log "准备应用目录..."
    
    mkdir -p $APP_DIR
    cd $APP_DIR
    
    # 如果目录不为空，清理旧文件
    if [ "$(ls -A $APP_DIR)" ]; then
        log "清理旧文件..."
        rm -rf $APP_DIR/*
    fi
    
    success "应用目录准备完成"
}

# 克隆代码
clone_code() {
    log "克隆最新代码..."
    
    cd $APP_DIR
    
    # 克隆代码
    git clone https://github.com/TigerYY/OpenAero.git .
    
    # 切换到指定分支
    git checkout 003-prd-document-enhancement
    
    # 拉取最新代码
    git pull origin 003-prd-document-enhancement
    
    success "代码克隆完成"
}

# 创建环境配置文件
create_env_file() {
    log "创建环境配置文件..."
    
    cat > $APP_DIR/.env.production << EOF
# OpenAero 生产环境配置
NODE_ENV=production
NEXTAUTH_URL=https://openaero.cn
NEXTAUTH_SECRET=your-nextauth-secret-key-here
DATABASE_URL=postgresql://username:password@localhost:5432/openaero_prod

# 应用配置
PORT=3000
HOSTNAME=0.0.0.0

# 国际化配置
DEFAULT_LOCALE=zh-CN
LOCALES=zh-CN,en-US

# 安全配置
CORS_ORIGIN=https://openaero.cn
TRUSTED_DOMAINS=openaero.cn,www.openaero.cn

# 监控配置
SENTRY_DSN=your-sentry-dsn-here
VERCEL_ANALYTICS_ID=your-analytics-id-here

# 缓存配置
REDIS_URL=redis://localhost:6379

# 文件上传配置
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/webp,application/pdf

# 邮件配置
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@openaero.cn
SMTP_PASS=your-email-password

# 日志配置
LOG_LEVEL=info
LOG_FORMAT=json
EOF
    
    success "环境配置文件创建完成"
}

# 构建Docker镜像
build_docker_image() {
    log "构建Docker镜像..."
    
    cd $APP_DIR
    
    # 构建镜像
    docker build -t $DOCKER_IMAGE .
    
    success "Docker镜像构建完成: $DOCKER_IMAGE"
}

# 停止现有容器
stop_existing_container() {
    log "停止现有容器..."
    
    if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
        docker stop $CONTAINER_NAME
        success "现有容器已停止"
    else
        warning "没有运行中的容器"
    fi
    
    if docker ps -aq -f name=$CONTAINER_NAME | grep -q .; then
        docker rm $CONTAINER_NAME
        success "旧容器已删除"
    fi
}

# 启动新容器
start_new_container() {
    log "启动新容器..."
    
    docker run -d \
        --name $CONTAINER_NAME \
        --restart unless-stopped \
        -p 3000:3000 \
        --env-file $APP_DIR/.env.production \
        -v $APP_DIR/logs:/app/logs \
        $DOCKER_IMAGE
    
    success "新容器启动完成"
}

# 更新Nginx配置
update_nginx_config() {
    log "更新Nginx配置..."
    
    # 备份原配置
    cp $NGINX_CONFIG $NGINX_CONFIG.backup.$(date +%Y%m%d-%H%M%S)
    
    # 创建新的Nginx配置
    cat > $NGINX_CONFIG << 'EOF'
server {
    if ($host = www.openaero.cn) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    if ($host = openaero.cn) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    server_name openaero.cn www.openaero.cn;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name openaero.cn www.openaero.cn;
    
    # SSL配置
    ssl_certificate /etc/letsencrypt/live/openaero.cn/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/openaero.cn/privkey.pem; # managed by Certbot
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # 代理到应用
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
        proxy_read_timeout 86400;
    }
    
    # 静态文件缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|eot|svg)$ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 健康检查
    location /health {
        proxy_pass http://localhost:3000/api/health;
        access_log off;
    }
}
EOF
    
    # 测试Nginx配置
    nginx -t
    
    # 重载Nginx
    systemctl reload nginx
    
    success "Nginx配置更新完成"
}

# 健康检查
health_check() {
    log "执行健康检查..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
            success "健康检查通过"
            return 0
        fi
        
        log "健康检查尝试 $attempt/$max_attempts..."
        sleep 10
        ((attempt++))
    done
    
    error "健康检查失败，请检查容器日志"
}

# 显示部署信息
show_deployment_info() {
    log "部署信息:"
    echo "  应用名称: $APP_NAME"
    echo "  版本: $VERSION"
    echo "  容器名称: $CONTAINER_NAME"
    echo "  应用URL: https://openaero.cn"
    echo "  健康检查: https://openaero.cn/health"
    echo "  容器状态: $(docker ps --format 'table {{.Names}}\t{{.Status}}' | grep $CONTAINER_NAME || echo '未运行')"
}

# 清理旧镜像
cleanup() {
    log "清理旧Docker镜像..."
    
    # 删除悬空镜像
    docker image prune -f
    
    # 删除未使用的镜像（保留最近3个版本）
    docker images $APP_NAME --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}" | \
    tail -n +2 | \
    sort -k3 -r | \
    tail -n +4 | \
    awk '{print $1":"$2}' | \
    xargs -r docker rmi || true
    
    success "清理完成"
}

# 主部署流程
main() {
    log "🚀 开始 OpenAero Docker 部署流程"
    
    check_docker
    create_backup
    prepare_app_directory
    clone_code
    create_env_file
    build_docker_image
    stop_existing_container
    start_new_container
    update_nginx_config
    health_check
    cleanup
    show_deployment_info
    
    success "🎉 部署完成！OpenAero 已成功部署到生产环境"
}

# 错误处理
trap 'error "部署过程中发生错误，请检查日志"' ERR

# 执行主流程
main "$@"

#!/bin/bash

# OpenAero 生产环境部署指导脚本
# 这个脚本将引导您完成完整的生产环境部署过程

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# 显示欢迎信息
show_welcome() {
    clear
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}  OpenAero 生产环境部署向导${NC}"
    echo -e "${GREEN}================================${NC}"
    echo ""
    echo "本向导将引导您完成 OpenAero 项目的生产环境部署。"
    echo "请确保您有足够的权限执行以下操作。"
    echo ""
    echo "部署步骤概览："
    echo "1. 环境检查和配置"
    echo "2. 域名和SSL证书设置"
    echo "3. 生产环境变量配置"
    echo "4. Docker服务部署"
    echo "5. 监控系统配置"
    echo "6. 部署验证和健康检查"
    echo ""
    read -p "按 Enter 键开始部署..."
}

# 步骤1：环境检查
step1_environment_check() {
    log_step "步骤 1/6: 环境检查和配置"
    echo ""
    
    # 检查操作系统
    log_info "检查操作系统..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        log_success "检测到 Linux 系统"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        log_warning "检测到 macOS 系统 - 这是开发环境，生产环境建议使用 Linux"
    else
        log_error "不支持的操作系统: $OSTYPE"
        exit 1
    fi
    
    # 检查 Docker
    log_info "检查 Docker..."
    if command -v docker &> /dev/null; then
        docker_version=$(docker --version)
        log_success "Docker 已安装: $docker_version"
    else
        log_error "Docker 未安装，请先安装 Docker"
        echo "安装命令（Ubuntu）："
        echo "curl -fsSL https://get.docker.com -o get-docker.sh"
        echo "sudo sh get-docker.sh"
        exit 1
    fi
    
    # 检查 Docker Compose
    log_info "检查 Docker Compose..."
    if command -v docker-compose &> /dev/null; then
        compose_version=$(docker-compose --version)
        log_success "Docker Compose 已安装: $compose_version"
    else
        log_error "Docker Compose 未安装"
        exit 1
    fi
    
    # 检查磁盘空间
    log_info "检查磁盘空间..."
    available_space=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
    available_gb=$((available_space / 1024 / 1024))
    if [ "$available_gb" -lt 5 ]; then
        log_warning "可用磁盘空间不足 5GB，当前: ${available_gb}GB"
    else
        log_success "磁盘空间充足: ${available_gb}GB"
    fi
    
    echo ""
    read -p "环境检查完成，按 Enter 键继续..."
}

# 步骤2：域名和SSL配置
step2_domain_ssl() {
    log_step "步骤 2/6: 域名和SSL证书设置"
    echo ""
    
    # 获取域名
    echo "请输入您的域名信息："
    read -p "主域名 (例如: example.com): " DOMAIN_NAME
    
    if [ -z "$DOMAIN_NAME" ]; then
        log_error "域名不能为空"
        exit 1
    fi
    
    log_info "您输入的域名: $DOMAIN_NAME"
    
    # 检查域名解析
    log_info "检查域名解析..."
    if nslookup "$DOMAIN_NAME" &> /dev/null; then
        log_success "域名解析正常"
    else
        log_warning "域名解析可能有问题，请确保域名已正确解析到此服务器"
    fi
    
    # 询问是否设置SSL
    echo ""
    read -p "是否需要设置 SSL 证书？(y/n): " setup_ssl
    
    if [[ "$setup_ssl" =~ ^[Yy]$ ]]; then
        log_info "准备设置 SSL 证书..."
        
        # 检查 certbot
        if ! command -v certbot &> /dev/null; then
            log_warning "Certbot 未安装，正在安装..."
            if [[ "$OSTYPE" == "linux-gnu"* ]]; then
                sudo apt-get update
                sudo apt-get install -y certbot
            else
                log_error "请手动安装 certbot"
                exit 1
            fi
        fi
        
        # 设置SSL证书
        log_info "设置 SSL 证书..."
        if [ -f "./scripts/ssl-setup.sh" ]; then
            chmod +x ./scripts/ssl-setup.sh
            ./scripts/ssl-setup.sh install "$DOMAIN_NAME"
        else
            log_error "SSL 设置脚本不存在"
            exit 1
        fi
    else
        log_warning "跳过 SSL 证书设置"
    fi
    
    echo ""
    read -p "域名和SSL配置完成，按 Enter 键继续..."
}

# 步骤3：生产环境变量配置
step3_env_config() {
    log_step "步骤 3/6: 生产环境变量配置"
    echo ""
    
    log_info "配置生产环境变量..."
    
    # 备份原有配置
    if [ -f ".env.production" ]; then
        cp .env.production .env.production.backup
        log_info "已备份原有配置文件"
    fi
    
    # 生成安全密钥
    log_info "生成安全密钥..."
    POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    
    # 更新环境变量文件
    cat > .env.production << EOF
# 生产环境配置
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# 应用配置
NEXT_PUBLIC_APP_URL=https://$DOMAIN_NAME
NEXT_PUBLIC_APP_NAME=OpenAero
NEXT_PUBLIC_APP_VERSION=1.0.0

# 数据库配置
DATABASE_URL="postgresql://openaero:$POSTGRES_PASSWORD@db:5432/openaero"
DIRECT_URL="postgresql://openaero:$POSTGRES_PASSWORD@db:5432/openaero"
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

# Redis配置
REDIS_URL="redis://redis:6379"
REDIS_PASSWORD=$REDIS_PASSWORD

# API配置
NEXT_PUBLIC_API_URL=/api
API_TIMEOUT=10000

# 认证配置
NEXTAUTH_URL=https://$DOMAIN_NAME
NEXTAUTH_SECRET=$NEXTAUTH_SECRET

# 监控配置
SENTRY_DSN=your-sentry-dsn
SENTRY_ORG=openaero
SENTRY_PROJECT=openaero-web

# 第三方服务
GOOGLE_ANALYTICS_ID=your-ga-id
GOOGLE_SITE_VERIFICATION=your-google-verification-code
YANDEX_VERIFICATION=your-yandex-verification-code

# 功能开关
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_MONITORING=true
NEXT_PUBLIC_ENABLE_DARK_MODE=false

# 环境优化配置
NEXT_PUBLIC_DEBUG_ENV=false
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=true
NEXT_PUBLIC_LOG_LEVEL=warn

# 安全配置
SECURE_HEADERS=true
FORCE_HTTPS=true
EOF
    
    log_success "生产环境变量配置完成"
    log_info "数据库密码: $POSTGRES_PASSWORD"
    log_info "Redis密码: $REDIS_PASSWORD"
    log_warning "请妥善保存这些密码！"
    
    echo ""
    read -p "环境变量配置完成，按 Enter 键继续..."
}

# 步骤4：Docker服务部署
step4_docker_deploy() {
    log_step "步骤 4/6: Docker服务部署"
    echo ""
    
    log_info "开始部署 Docker 服务..."
    
    # 检查部署脚本
    if [ ! -f "./deploy-production.sh" ]; then
        log_error "部署脚本不存在"
        exit 1
    fi
    
    # 执行部署
    log_info "执行生产环境部署..."
    chmod +x ./deploy-production.sh
    
    if ./deploy-production.sh deploy; then
        log_success "Docker 服务部署成功"
    else
        log_error "Docker 服务部署失败"
        exit 1
    fi
    
    # 检查服务状态
    log_info "检查服务状态..."
    ./deploy-production.sh status
    
    echo ""
    read -p "Docker服务部署完成，按 Enter 键继续..."
}

# 步骤5：监控系统配置
step5_monitoring() {
    log_step "步骤 5/6: 监控系统配置"
    echo ""
    
    read -p "是否需要设置监控系统？(y/n): " setup_monitoring
    
    if [[ "$setup_monitoring" =~ ^[Yy]$ ]]; then
        log_info "设置监控系统..."
        
        # 获取邮件配置
        echo "请输入邮件告警配置："
        read -p "告警邮箱: " ALERT_EMAIL
        read -p "SMTP服务器 (例如: smtp.gmail.com): " SMTP_HOST
        read -p "SMTP端口 (例如: 587): " SMTP_PORT
        read -p "SMTP用户名: " SMTP_USER
        read -s -p "SMTP密码: " SMTP_PASSWORD
        echo ""
        
        # 设置监控环境变量
        export ALERT_EMAIL="$ALERT_EMAIL"
        export SMTP_HOST="$SMTP_HOST"
        export SMTP_PORT="$SMTP_PORT"
        export SMTP_USER="$SMTP_USER"
        export SMTP_PASSWORD="$SMTP_PASSWORD"
        
        # 执行监控设置
        if [ -f "./scripts/monitoring-setup.sh" ]; then
            chmod +x ./scripts/monitoring-setup.sh
            ./scripts/monitoring-setup.sh setup
            
            # 启动监控服务
            cd monitoring
            ./monitoring.sh start
            cd ..
            
            log_success "监控系统设置完成"
            log_info "Grafana 访问地址: http://$DOMAIN_NAME:3001"
            log_info "Prometheus 访问地址: http://$DOMAIN_NAME:9090"
        else
            log_error "监控设置脚本不存在"
        fi
    else
        log_warning "跳过监控系统设置"
    fi
    
    echo ""
    read -p "监控系统配置完成，按 Enter 键继续..."
}

# 步骤6：部署验证
step6_verification() {
    log_step "步骤 6/6: 部署验证和健康检查"
    echo ""
    
    log_info "执行部署验证..."
    
    # 健康检查
    if [ -f "./scripts/health-monitor.sh" ]; then
        chmod +x ./scripts/health-monitor.sh
        log_info "执行健康检查..."
        ./scripts/health-monitor.sh check
    fi
    
    # 检查网站访问
    log_info "检查网站访问..."
    if curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN_NAME" | grep -q "200"; then
        log_success "网站访问正常"
    else
        log_warning "网站访问可能有问题，请检查"
    fi
    
    # 显示部署结果
    echo ""
    log_success "🎉 OpenAero 生产环境部署完成！"
    echo ""
    echo "访问地址："
    echo "  主站: https://$DOMAIN_NAME"
    if [[ "$setup_monitoring" =~ ^[Yy]$ ]]; then
        echo "  监控: http://$DOMAIN_NAME:3001 (admin/admin123)"
    fi
    echo ""
    echo "管理命令："
    echo "  查看状态: ./deploy-production.sh status"
    echo "  查看日志: ./deploy-production.sh logs"
    echo "  重启服务: ./deploy-production.sh restart"
    echo "  健康检查: ./scripts/health-monitor.sh check"
    echo ""
    echo "重要提醒："
    echo "  1. 请妥善保存数据库和Redis密码"
    echo "  2. 定期检查SSL证书有效期"
    echo "  3. 监控系统运行状态"
    echo "  4. 定期备份数据"
    echo ""
}

# 主函数
main() {
    case "${1:-deploy}" in
        deploy)
            show_welcome
            step1_environment_check
            step2_domain_ssl
            step3_env_config
            step4_docker_deploy
            step5_monitoring
            step6_verification
            ;;
        help)
            echo "OpenAero 生产环境部署向导"
            echo ""
            echo "用法: $0 [命令]"
            echo ""
            echo "命令:"
            echo "  deploy    开始部署向导（默认）"
            echo "  help      显示帮助信息"
            ;;
        *)
            log_error "未知命令: $1"
            echo "使用 '$0 help' 查看帮助信息"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
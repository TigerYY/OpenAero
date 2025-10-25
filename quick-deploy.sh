#!/bin/bash

# OpenAero 快速部署脚本
# 用于快速部署到生产环境（适合有经验的用户）

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置变量
DOMAIN_NAME="${DOMAIN_NAME:-}"
SETUP_SSL="${SETUP_SSL:-true}"
SETUP_MONITORING="${SETUP_MONITORING:-true}"
ALERT_EMAIL="${ALERT_EMAIL:-}"

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

# 显示帮助信息
show_help() {
    echo "OpenAero 快速部署脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "环境变量:"
    echo "  DOMAIN_NAME        域名 (必需)"
    echo "  SETUP_SSL          是否设置SSL (默认: true)"
    echo "  SETUP_MONITORING   是否设置监控 (默认: true)"
    echo "  ALERT_EMAIL        告警邮箱"
    echo ""
    echo "示例:"
    echo "  DOMAIN_NAME=example.com ./quick-deploy.sh"
    echo "  DOMAIN_NAME=example.com SETUP_SSL=false ./quick-deploy.sh"
    echo ""
    echo "选项:"
    echo "  --help, -h         显示帮助信息"
    echo "  --check-only       仅检查环境，不执行部署"
    echo "  --skip-ssl         跳过SSL设置"
    echo "  --skip-monitoring  跳过监控设置"
}

# 检查必需的环境变量
check_requirements() {
    log_info "检查部署要求..."
    
    if [ -z "$DOMAIN_NAME" ]; then
        log_error "DOMAIN_NAME 环境变量未设置"
        echo "请设置域名: export DOMAIN_NAME=your-domain.com"
        exit 1
    fi
    
    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        exit 1
    fi
    
    # 检查 Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装"
        exit 1
    fi
    
    log_success "环境检查通过"
}

# 生成环境配置
generate_env_config() {
    log_info "生成生产环境配置..."
    
    # 生成安全密钥
    POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    
    # 备份现有配置
    if [ -f ".env.production" ]; then
        cp .env.production .env.production.backup.$(date +%Y%m%d_%H%M%S)
    fi
    
    # 创建新配置
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
SENTRY_DSN=
SENTRY_ORG=openaero
SENTRY_PROJECT=openaero-web

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
    
    log_success "环境配置生成完成"
    
    # 保存密钥到文件
    cat > .deployment-secrets << EOF
# OpenAero 部署密钥 - 请妥善保存
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
DOMAIN_NAME=$DOMAIN_NAME
DEPLOYMENT_DATE=$(date)
EOF
    
    chmod 600 .deployment-secrets
    log_info "部署密钥已保存到 .deployment-secrets 文件"
}

# 设置SSL证书
setup_ssl() {
    if [ "$SETUP_SSL" = "true" ]; then
        log_info "设置 SSL 证书..."
        
        if [ -f "./scripts/ssl-setup.sh" ]; then
            chmod +x ./scripts/ssl-setup.sh
            if ./scripts/ssl-setup.sh install "$DOMAIN_NAME"; then
                log_success "SSL 证书设置成功"
            else
                log_warning "SSL 证书设置失败，将使用 HTTP"
            fi
        else
            log_warning "SSL 设置脚本不存在，跳过 SSL 配置"
        fi
    else
        log_info "跳过 SSL 设置"
    fi
}

# 部署Docker服务
deploy_services() {
    log_info "部署 Docker 服务..."
    
    if [ -f "./deploy-production.sh" ]; then
        chmod +x ./deploy-production.sh
        if ./deploy-production.sh deploy; then
            log_success "Docker 服务部署成功"
        else
            log_error "Docker 服务部署失败"
            exit 1
        fi
    else
        log_error "部署脚本不存在"
        exit 1
    fi
}

# 设置监控系统
setup_monitoring() {
    if [ "$SETUP_MONITORING" = "true" ]; then
        log_info "设置监控系统..."
        
        if [ -f "./scripts/monitoring-setup.sh" ]; then
            chmod +x ./scripts/monitoring-setup.sh
            
            # 设置监控环境变量
            if [ -n "$ALERT_EMAIL" ]; then
                export ALERT_EMAIL="$ALERT_EMAIL"
            fi
            
            if ./scripts/monitoring-setup.sh setup; then
                log_success "监控系统设置成功"
                
                # 启动监控服务
                if [ -d "./monitoring" ]; then
                    cd monitoring
                    if [ -f "./monitoring.sh" ]; then
                        ./monitoring.sh start
                        log_success "监控服务启动成功"
                    fi
                    cd ..
                fi
            else
                log_warning "监控系统设置失败"
            fi
        else
            log_warning "监控设置脚本不存在，跳过监控配置"
        fi
    else
        log_info "跳过监控系统设置"
    fi
}

# 验证部署
verify_deployment() {
    log_info "验证部署结果..."
    
    # 检查服务状态
    if [ -f "./deploy-production.sh" ]; then
        ./deploy-production.sh status
    fi
    
    # 健康检查
    if [ -f "./scripts/health-monitor.sh" ]; then
        chmod +x ./scripts/health-monitor.sh
        ./scripts/health-monitor.sh check
    fi
    
    # 检查网站访问
    sleep 10  # 等待服务启动
    if curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN_NAME" | grep -q "200"; then
        log_success "网站访问正常"
    elif curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN_NAME" | grep -q "200"; then
        log_success "网站访问正常 (HTTP)"
    else
        log_warning "网站访问可能有问题"
    fi
}

# 显示部署结果
show_deployment_result() {
    echo ""
    log_success "🎉 OpenAero 快速部署完成！"
    echo ""
    echo "部署信息："
    echo "  域名: $DOMAIN_NAME"
    echo "  SSL: $([ "$SETUP_SSL" = "true" ] && echo "已启用" || echo "未启用")"
    echo "  监控: $([ "$SETUP_MONITORING" = "true" ] && echo "已启用" || echo "未启用")"
    echo ""
    echo "访问地址："
    if [ "$SETUP_SSL" = "true" ]; then
        echo "  主站: https://$DOMAIN_NAME"
    else
        echo "  主站: http://$DOMAIN_NAME"
    fi
    if [ "$SETUP_MONITORING" = "true" ]; then
        echo "  监控: http://$DOMAIN_NAME:3001 (admin/admin123)"
    fi
    echo ""
    echo "管理命令："
    echo "  查看状态: ./deploy-production.sh status"
    echo "  查看日志: ./deploy-production.sh logs"
    echo "  重启服务: ./deploy-production.sh restart"
    echo "  健康检查: ./scripts/health-monitor.sh check"
    echo ""
    echo "重要文件："
    echo "  部署密钥: .deployment-secrets"
    echo "  环境配置: .env.production"
    echo ""
}

# 主函数
main() {
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help|-h)
                show_help
                exit 0
                ;;
            --check-only)
                check_requirements
                log_success "环境检查完成，可以进行部署"
                exit 0
                ;;
            --skip-ssl)
                SETUP_SSL=false
                ;;
            --skip-monitoring)
                SETUP_MONITORING=false
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
        shift
    done
    
    # 执行部署流程
    log_info "开始 OpenAero 快速部署..."
    
    check_requirements
    generate_env_config
    setup_ssl
    deploy_services
    setup_monitoring
    verify_deployment
    show_deployment_result
}

# 执行主函数
main "$@"
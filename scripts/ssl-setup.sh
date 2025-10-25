#!/bin/bash

# OpenAero SSL 证书配置脚本
# 支持 Let's Encrypt 证书的自动获取、安装和续期

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# 配置变量
DOMAIN=""
EMAIL=""
WEBROOT_PATH="/var/www/html"
SSL_DIR="./nginx/ssl"
NGINX_CONF="./nginx/nginx.conf"
COMPOSE_FILE="./docker-compose.production.yml"

# 显示帮助信息
show_help() {
    cat << EOF
OpenAero SSL 证书管理脚本

用法: $0 [选项] <命令> [参数]

命令:
  setup <domain> <email>     - 初始设置 SSL 证书
  renew [domain]            - 续期 SSL 证书
  install <domain>          - 安装现有证书到项目
  check [domain]            - 检查证书状态
  auto-renew               - 设置自动续期 cron 任务
  remove <domain>          - 移除证书

选项:
  -h, --help              - 显示此帮助信息
  -w, --webroot <path>    - 指定 webroot 路径 (默认: /var/www/html)
  -d, --dry-run           - 测试模式，不执行实际操作

示例:
  $0 setup example.com admin@example.com
  $0 renew example.com
  $0 check
  $0 auto-renew

EOF
}

# 检查系统要求
check_requirements() {
    log_info "检查系统要求..."
    
    # 检查是否为 root 用户
    if [[ $EUID -ne 0 ]]; then
        log_error "此脚本需要 root 权限运行"
        exit 1
    fi
    
    # 检查 certbot 是否安装
    if ! command -v certbot &> /dev/null; then
        log_info "安装 Certbot..."
        if command -v apt-get &> /dev/null; then
            apt-get update
            apt-get install -y certbot python3-certbot-nginx
        elif command -v yum &> /dev/null; then
            yum install -y certbot python3-certbot-nginx
        else
            log_error "不支持的操作系统，请手动安装 Certbot"
            exit 1
        fi
    fi
    
    # 检查 nginx 是否安装
    if ! command -v nginx &> /dev/null; then
        log_warning "Nginx 未安装，将使用 standalone 模式"
    fi
    
    log_success "系统要求检查完成"
}

# 创建 SSL 目录
create_ssl_directory() {
    log_info "创建 SSL 证书目录..."
    mkdir -p "$SSL_DIR"
    chmod 755 "$SSL_DIR"
    log_success "SSL 目录创建完成: $SSL_DIR"
}

# 获取 SSL 证书
obtain_certificate() {
    local domain="$1"
    local email="$2"
    local dry_run="$3"
    
    log_info "为域名 $domain 获取 SSL 证书..."
    
    local certbot_args=(
        "certonly"
        "--standalone"
        "--non-interactive"
        "--agree-tos"
        "--email" "$email"
        "-d" "$domain"
        "-d" "www.$domain"
    )
    
    if [[ "$dry_run" == "true" ]]; then
        certbot_args+=("--dry-run")
        log_info "运行测试模式..."
    fi
    
    # 临时停止可能占用 80 端口的服务
    if systemctl is-active --quiet nginx; then
        log_info "临时停止 Nginx 服务..."
        systemctl stop nginx
        local restart_nginx=true
    fi
    
    if docker-compose -f "$COMPOSE_FILE" ps nginx | grep -q "Up"; then
        log_info "临时停止 Docker Nginx 容器..."
        docker-compose -f "$COMPOSE_FILE" stop nginx
        local restart_docker_nginx=true
    fi
    
    # 执行 certbot
    if certbot "${certbot_args[@]}"; then
        log_success "SSL 证书获取成功"
        
        if [[ "$dry_run" != "true" ]]; then
            install_certificate "$domain"
        fi
    else
        log_error "SSL 证书获取失败"
        exit 1
    fi
    
    # 重启服务
    if [[ "$restart_nginx" == "true" ]]; then
        systemctl start nginx
    fi
    
    if [[ "$restart_docker_nginx" == "true" ]]; then
        docker-compose -f "$COMPOSE_FILE" start nginx
    fi
}

# 安装证书到项目目录
install_certificate() {
    local domain="$1"
    local cert_path="/etc/letsencrypt/live/$domain"
    
    log_info "安装证书到项目目录..."
    
    if [[ ! -d "$cert_path" ]]; then
        log_error "证书目录不存在: $cert_path"
        exit 1
    fi
    
    # 复制证书文件
    cp "$cert_path/fullchain.pem" "$SSL_DIR/"
    cp "$cert_path/privkey.pem" "$SSL_DIR/"
    
    # 设置权限
    chmod 644 "$SSL_DIR/fullchain.pem"
    chmod 600 "$SSL_DIR/privkey.pem"
    
    # 创建符号链接（便于 nginx 配置）
    ln -sf fullchain.pem "$SSL_DIR/cert.pem"
    ln -sf privkey.pem "$SSL_DIR/key.pem"
    
    log_success "证书安装完成"
    
    # 更新 nginx 配置中的域名
    if [[ -f "$NGINX_CONF" ]]; then
        log_info "更新 Nginx 配置..."
        sed -i.bak "s/yourdomain\.com/$domain/g" "$NGINX_CONF"
        log_success "Nginx 配置更新完成"
    fi
}

# 续期证书
renew_certificate() {
    local domain="$1"
    
    log_info "续期 SSL 证书..."
    
    if [[ -n "$domain" ]]; then
        certbot renew --cert-name "$domain"
    else
        certbot renew
    fi
    
    if [[ $? -eq 0 ]]; then
        log_success "证书续期成功"
        
        # 重新安装证书
        if [[ -n "$domain" ]]; then
            install_certificate "$domain"
        else
            # 查找所有证书并安装
            for cert_dir in /etc/letsencrypt/live/*/; do
                if [[ -d "$cert_dir" ]]; then
                    local cert_domain=$(basename "$cert_dir")
                    install_certificate "$cert_domain"
                fi
            done
        fi
        
        # 重启相关服务
        restart_services
    else
        log_error "证书续期失败"
        exit 1
    fi
}

# 检查证书状态
check_certificate() {
    local domain="$1"
    
    log_info "检查 SSL 证书状态..."
    
    if [[ -n "$domain" ]]; then
        certbot certificates -d "$domain"
    else
        certbot certificates
    fi
    
    # 检查本地证书文件
    if [[ -f "$SSL_DIR/fullchain.pem" ]]; then
        log_info "本地证书信息:"
        openssl x509 -in "$SSL_DIR/fullchain.pem" -text -noout | grep -E "(Subject:|Not Before|Not After)"
    else
        log_warning "本地证书文件不存在"
    fi
}

# 设置自动续期
setup_auto_renew() {
    log_info "设置自动续期 cron 任务..."
    
    local cron_job="0 12 * * * /usr/bin/certbot renew --quiet && $PWD/scripts/ssl-setup.sh install-all"
    
    # 检查是否已存在 cron 任务
    if crontab -l 2>/dev/null | grep -q "certbot renew"; then
        log_warning "自动续期任务已存在"
    else
        (crontab -l 2>/dev/null; echo "$cron_job") | crontab -
        log_success "自动续期任务设置完成"
    fi
    
    # 创建续期后处理脚本
    cat > /etc/letsencrypt/renewal-hooks/deploy/openaero-deploy.sh << 'EOF'
#!/bin/bash
# OpenAero 证书续期后处理脚本

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="/path/to/openaero.web"  # 请修改为实际项目路径

cd "$PROJECT_DIR"
./scripts/ssl-setup.sh install-all
docker-compose -f docker-compose.production.yml restart nginx
EOF
    
    chmod +x /etc/letsencrypt/renewal-hooks/deploy/openaero-deploy.sh
    log_success "续期后处理脚本创建完成"
}

# 安装所有证书
install_all_certificates() {
    log_info "安装所有可用证书..."
    
    for cert_dir in /etc/letsencrypt/live/*/; do
        if [[ -d "$cert_dir" ]]; then
            local domain=$(basename "$cert_dir")
            log_info "安装证书: $domain"
            install_certificate "$domain"
        fi
    done
    
    log_success "所有证书安装完成"
}

# 移除证书
remove_certificate() {
    local domain="$1"
    
    log_info "移除域名 $domain 的 SSL 证书..."
    
    # 删除 Let's Encrypt 证书
    certbot delete --cert-name "$domain"
    
    # 删除本地证书文件
    rm -f "$SSL_DIR/fullchain.pem" "$SSL_DIR/privkey.pem"
    rm -f "$SSL_DIR/cert.pem" "$SSL_DIR/key.pem"
    
    log_success "证书移除完成"
}

# 重启相关服务
restart_services() {
    log_info "重启相关服务..."
    
    # 重启 Docker 服务
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q "nginx"; then
        docker-compose -f "$COMPOSE_FILE" restart nginx
        log_success "Docker Nginx 服务重启完成"
    fi
    
    # 重启系统 Nginx（如果存在）
    if systemctl is-active --quiet nginx; then
        systemctl reload nginx
        log_success "系统 Nginx 服务重载完成"
    fi
}

# 主函数
main() {
    local command="$1"
    local dry_run=false
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -w|--webroot)
                WEBROOT_PATH="$2"
                shift 2
                ;;
            -d|--dry-run)
                dry_run=true
                shift
                ;;
            setup)
                command="setup"
                DOMAIN="$2"
                EMAIL="$3"
                shift 3
                ;;
            renew)
                command="renew"
                DOMAIN="$2"
                shift 2
                ;;
            install)
                command="install"
                DOMAIN="$2"
                shift 2
                ;;
            install-all)
                command="install-all"
                shift
                ;;
            check)
                command="check"
                DOMAIN="$2"
                shift 2
                ;;
            auto-renew)
                command="auto-renew"
                shift
                ;;
            remove)
                command="remove"
                DOMAIN="$2"
                shift 2
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 执行命令
    case "$command" in
        setup)
            if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
                log_error "setup 命令需要域名和邮箱参数"
                show_help
                exit 1
            fi
            check_requirements
            create_ssl_directory
            obtain_certificate "$DOMAIN" "$EMAIL" "$dry_run"
            ;;
        renew)
            check_requirements
            renew_certificate "$DOMAIN"
            ;;
        install)
            if [[ -z "$DOMAIN" ]]; then
                log_error "install 命令需要域名参数"
                exit 1
            fi
            create_ssl_directory
            install_certificate "$DOMAIN"
            ;;
        install-all)
            create_ssl_directory
            install_all_certificates
            ;;
        check)
            check_certificate "$DOMAIN"
            ;;
        auto-renew)
            check_requirements
            setup_auto_renew
            ;;
        remove)
            if [[ -z "$DOMAIN" ]]; then
                log_error "remove 命令需要域名参数"
                exit 1
            fi
            check_requirements
            remove_certificate "$DOMAIN"
            ;;
        *)
            log_error "请指定有效的命令"
            show_help
            exit 1
            ;;
    esac
}

# 如果直接运行脚本
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
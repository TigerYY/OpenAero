#!/bin/bash

# OpenAero SSL 证书管理和监控脚本
# 提供证书状态监控、自动续期、健康检查等功能

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置变量
SSL_DIR="./nginx/ssl"
COMPOSE_FILE="./docker-compose.production.yml"
LOG_FILE="./logs/ssl-manager.log"
ALERT_EMAIL=""
DAYS_BEFORE_EXPIRY=30

# 日志函数
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # 创建日志目录
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # 写入日志文件
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    # 控制台输出
    case "$level" in
        "INFO")
            echo -e "${BLUE}[$timestamp] INFO: $message${NC}"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[$timestamp] SUCCESS: $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}[$timestamp] WARNING: $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}[$timestamp] ERROR: $message${NC}"
            ;;
        "DEBUG")
            echo -e "${PURPLE}[$timestamp] DEBUG: $message${NC}"
            ;;
    esac
}

# 显示帮助信息
show_help() {
    cat << EOF
${CYAN}OpenAero SSL 证书管理脚本${NC}

${YELLOW}用法:${NC} $0 [选项] <命令>

${YELLOW}命令:${NC}
  ${GREEN}status${NC}              - 显示所有证书状态
  ${GREEN}check-expiry${NC}        - 检查证书过期时间
  ${GREEN}monitor${NC}             - 监控证书状态并发送告警
  ${GREEN}health-check${NC}        - 执行 SSL 健康检查
  ${GREEN}backup${NC}              - 备份证书文件
  ${GREEN}restore <backup_file>${NC} - 恢复证书文件
  ${GREEN}validate${NC}            - 验证证书配置
  ${GREEN}report${NC}              - 生成证书状态报告

${YELLOW}选项:${NC}
  ${GREEN}-h, --help${NC}          - 显示此帮助信息
  ${GREEN}-e, --email <email>${NC}  - 设置告警邮箱
  ${GREEN}-d, --days <days>${NC}    - 设置过期告警天数 (默认: 30)
  ${GREEN}-v, --verbose${NC}       - 详细输出模式
  ${GREEN}-q, --quiet${NC}         - 静默模式

${YELLOW}示例:${NC}
  $0 status
  $0 check-expiry -d 15
  $0 monitor -e admin@example.com
  $0 health-check -v

EOF
}

# 获取证书信息
get_cert_info() {
    local cert_file="$1"
    
    if [[ ! -f "$cert_file" ]]; then
        echo "证书文件不存在"
        return 1
    fi
    
    # 获取证书详细信息
    local cert_info=$(openssl x509 -in "$cert_file" -text -noout 2>/dev/null)
    
    if [[ $? -ne 0 ]]; then
        echo "无法读取证书文件"
        return 1
    fi
    
    # 提取关键信息
    local subject=$(echo "$cert_info" | grep "Subject:" | sed 's/.*Subject: //')
    local issuer=$(echo "$cert_info" | grep "Issuer:" | sed 's/.*Issuer: //')
    local not_before=$(echo "$cert_info" | grep "Not Before:" | sed 's/.*Not Before: //')
    local not_after=$(echo "$cert_info" | grep "Not After :" | sed 's/.*Not After : //')
    local san=$(echo "$cert_info" | grep -A1 "Subject Alternative Name:" | tail -1 | sed 's/.*DNS://' | tr ',' '\n' | sed 's/^ *//')
    
    echo "Subject: $subject"
    echo "Issuer: $issuer"
    echo "Valid From: $not_before"
    echo "Valid Until: $not_after"
    echo "SAN: $san"
}

# 检查证书过期时间
check_expiry() {
    local cert_file="$SSL_DIR/fullchain.pem"
    local days_threshold="$1"
    
    log "INFO" "检查证书过期时间..."
    
    if [[ ! -f "$cert_file" ]]; then
        log "ERROR" "证书文件不存在: $cert_file"
        return 1
    fi
    
    # 获取证书过期时间
    local expiry_date=$(openssl x509 -in "$cert_file" -noout -enddate 2>/dev/null | cut -d= -f2)
    
    if [[ -z "$expiry_date" ]]; then
        log "ERROR" "无法获取证书过期时间"
        return 1
    fi
    
    # 转换为时间戳
    local expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$expiry_date" +%s 2>/dev/null)
    local current_timestamp=$(date +%s)
    local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
    
    log "INFO" "证书将在 $days_until_expiry 天后过期 ($expiry_date)"
    
    # 检查是否需要告警
    if [[ $days_until_expiry -le $days_threshold ]]; then
        log "WARNING" "证书即将过期！剩余天数: $days_until_expiry"
        
        # 发送告警邮件
        if [[ -n "$ALERT_EMAIL" ]]; then
            send_alert_email "证书即将过期" "SSL 证书将在 $days_until_expiry 天后过期，请及时续期。"
        fi
        
        return 2
    else
        log "SUCCESS" "证书状态正常，剩余 $days_until_expiry 天"
        return 0
    fi
}

# 显示证书状态
show_status() {
    log "INFO" "显示 SSL 证书状态..."
    
    echo -e "\n${CYAN}=== OpenAero SSL 证书状态 ===${NC}\n"
    
    # 检查证书文件
    local cert_file="$SSL_DIR/fullchain.pem"
    local key_file="$SSL_DIR/privkey.pem"
    
    if [[ -f "$cert_file" ]]; then
        echo -e "${GREEN}✓${NC} 证书文件存在: $cert_file"
        
        # 显示证书信息
        echo -e "\n${YELLOW}证书详细信息:${NC}"
        get_cert_info "$cert_file" | while read line; do
            echo "  $line"
        done
        
        # 检查过期时间
        echo -e "\n${YELLOW}过期检查:${NC}"
        if check_expiry "$DAYS_BEFORE_EXPIRY" >/dev/null 2>&1; then
            echo -e "  ${GREEN}✓${NC} 证书状态正常"
        else
            echo -e "  ${RED}✗${NC} 证书即将过期或已过期"
        fi
    else
        echo -e "${RED}✗${NC} 证书文件不存在: $cert_file"
    fi
    
    if [[ -f "$key_file" ]]; then
        echo -e "${GREEN}✓${NC} 私钥文件存在: $key_file"
        
        # 检查私钥权限
        local key_perms=$(stat -c "%a" "$key_file" 2>/dev/null || stat -f "%A" "$key_file" 2>/dev/null)
        if [[ "$key_perms" == "600" ]]; then
            echo -e "  ${GREEN}✓${NC} 私钥权限正确 (600)"
        else
            echo -e "  ${YELLOW}!${NC} 私钥权限: $key_perms (建议: 600)"
        fi
    else
        echo -e "${RED}✗${NC} 私钥文件不存在: $key_file"
    fi
    
    # 检查 Docker 服务状态
    echo -e "\n${YELLOW}服务状态:${NC}"
    if docker-compose -f "$COMPOSE_FILE" ps nginx 2>/dev/null | grep -q "Up"; then
        echo -e "  ${GREEN}✓${NC} Nginx 容器运行中"
    else
        echo -e "  ${RED}✗${NC} Nginx 容器未运行"
    fi
}

# SSL 健康检查
health_check() {
    local verbose="$1"
    
    log "INFO" "执行 SSL 健康检查..."
    
    local errors=0
    
    # 检查证书文件
    if [[ ! -f "$SSL_DIR/fullchain.pem" ]]; then
        log "ERROR" "证书文件缺失"
        ((errors++))
    fi
    
    if [[ ! -f "$SSL_DIR/privkey.pem" ]]; then
        log "ERROR" "私钥文件缺失"
        ((errors++))
    fi
    
    # 检查证书和私钥匹配
    if [[ -f "$SSL_DIR/fullchain.pem" && -f "$SSL_DIR/privkey.pem" ]]; then
        local cert_modulus=$(openssl x509 -noout -modulus -in "$SSL_DIR/fullchain.pem" 2>/dev/null | openssl md5)
        local key_modulus=$(openssl rsa -noout -modulus -in "$SSL_DIR/privkey.pem" 2>/dev/null | openssl md5)
        
        if [[ "$cert_modulus" != "$key_modulus" ]]; then
            log "ERROR" "证书和私钥不匹配"
            ((errors++))
        elif [[ "$verbose" == "true" ]]; then
            log "SUCCESS" "证书和私钥匹配"
        fi
    fi
    
    # 检查证书过期
    if ! check_expiry "$DAYS_BEFORE_EXPIRY" >/dev/null 2>&1; then
        ((errors++))
    fi
    
    # 检查 HTTPS 连接（如果服务运行中）
    if docker-compose -f "$COMPOSE_FILE" ps nginx 2>/dev/null | grep -q "Up"; then
        local https_port=$(docker-compose -f "$COMPOSE_FILE" port nginx 443 2>/dev/null | cut -d: -f2)
        if [[ -n "$https_port" ]]; then
            if curl -k -s --connect-timeout 5 "https://localhost:$https_port" >/dev/null 2>&1; then
                if [[ "$verbose" == "true" ]]; then
                    log "SUCCESS" "HTTPS 连接测试通过"
                fi
            else
                log "ERROR" "HTTPS 连接测试失败"
                ((errors++))
            fi
        fi
    fi
    
    # 返回结果
    if [[ $errors -eq 0 ]]; then
        log "SUCCESS" "SSL 健康检查通过"
        return 0
    else
        log "ERROR" "SSL 健康检查发现 $errors 个问题"
        return 1
    fi
}

# 备份证书
backup_certificates() {
    log "INFO" "备份 SSL 证书..."
    
    local backup_dir="./backups/ssl"
    local backup_file="ssl-backup-$(date +%Y%m%d_%H%M%S).tar.gz"
    
    mkdir -p "$backup_dir"
    
    if [[ -d "$SSL_DIR" ]]; then
        tar -czf "$backup_dir/$backup_file" -C "$(dirname "$SSL_DIR")" "$(basename "$SSL_DIR")"
        log "SUCCESS" "证书备份完成: $backup_dir/$backup_file"
        echo "$backup_dir/$backup_file"
    else
        log "ERROR" "SSL 目录不存在: $SSL_DIR"
        return 1
    fi
}

# 恢复证书
restore_certificates() {
    local backup_file="$1"
    
    if [[ ! -f "$backup_file" ]]; then
        log "ERROR" "备份文件不存在: $backup_file"
        return 1
    fi
    
    log "INFO" "恢复 SSL 证书从: $backup_file"
    
    # 备份当前证书
    if [[ -d "$SSL_DIR" ]]; then
        local current_backup="$SSL_DIR.backup.$(date +%Y%m%d_%H%M%S)"
        mv "$SSL_DIR" "$current_backup"
        log "INFO" "当前证书已备份到: $current_backup"
    fi
    
    # 恢复证书
    tar -xzf "$backup_file" -C "$(dirname "$SSL_DIR")"
    
    if [[ $? -eq 0 ]]; then
        log "SUCCESS" "证书恢复完成"
        
        # 重启服务
        if docker-compose -f "$COMPOSE_FILE" ps nginx 2>/dev/null | grep -q "Up"; then
            docker-compose -f "$COMPOSE_FILE" restart nginx
            log "INFO" "Nginx 服务已重启"
        fi
    else
        log "ERROR" "证书恢复失败"
        return 1
    fi
}

# 验证证书配置
validate_configuration() {
    log "INFO" "验证 SSL 证书配置..."
    
    local errors=0
    
    # 检查 Nginx 配置
    if [[ -f "./nginx/nginx.conf" ]]; then
        if docker run --rm -v "$PWD/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" nginx:alpine nginx -t 2>/dev/null; then
            log "SUCCESS" "Nginx 配置语法正确"
        else
            log "ERROR" "Nginx 配置语法错误"
            ((errors++))
        fi
    else
        log "WARNING" "Nginx 配置文件不存在"
    fi
    
    # 检查 Docker Compose 配置
    if docker-compose -f "$COMPOSE_FILE" config >/dev/null 2>&1; then
        log "SUCCESS" "Docker Compose 配置正确"
    else
        log "ERROR" "Docker Compose 配置错误"
        ((errors++))
    fi
    
    # 检查证书文件权限
    if [[ -f "$SSL_DIR/privkey.pem" ]]; then
        local perms=$(stat -c "%a" "$SSL_DIR/privkey.pem" 2>/dev/null || stat -f "%A" "$SSL_DIR/privkey.pem" 2>/dev/null)
        if [[ "$perms" != "600" ]]; then
            log "WARNING" "私钥文件权限不安全: $perms (建议: 600)"
        fi
    fi
    
    return $errors
}

# 生成状态报告
generate_report() {
    log "INFO" "生成 SSL 证书状态报告..."
    
    local report_file="./logs/ssl-report-$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "OpenAero SSL 证书状态报告"
        echo "生成时间: $(date)"
        echo "==============================="
        echo
        
        echo "证书文件状态:"
        if [[ -f "$SSL_DIR/fullchain.pem" ]]; then
            echo "✓ 证书文件存在"
            get_cert_info "$SSL_DIR/fullchain.pem"
        else
            echo "✗ 证书文件不存在"
        fi
        
        echo
        echo "过期检查:"
        if check_expiry "$DAYS_BEFORE_EXPIRY" 2>&1; then
            echo "✓ 证书状态正常"
        else
            echo "✗ 证书需要关注"
        fi
        
        echo
        echo "健康检查:"
        if health_check "false" 2>&1; then
            echo "✓ 健康检查通过"
        else
            echo "✗ 健康检查失败"
        fi
        
        echo
        echo "服务状态:"
        docker-compose -f "$COMPOSE_FILE" ps 2>/dev/null || echo "无法获取服务状态"
        
    } > "$report_file"
    
    log "SUCCESS" "报告生成完成: $report_file"
    echo "$report_file"
}

# 发送告警邮件
send_alert_email() {
    local subject="$1"
    local message="$2"
    
    if [[ -z "$ALERT_EMAIL" ]]; then
        log "WARNING" "未设置告警邮箱，跳过邮件发送"
        return 0
    fi
    
    # 检查是否安装了邮件发送工具
    if command -v mail >/dev/null 2>&1; then
        echo "$message" | mail -s "[OpenAero SSL Alert] $subject" "$ALERT_EMAIL"
        log "INFO" "告警邮件已发送到: $ALERT_EMAIL"
    elif command -v sendmail >/dev/null 2>&1; then
        {
            echo "To: $ALERT_EMAIL"
            echo "Subject: [OpenAero SSL Alert] $subject"
            echo
            echo "$message"
        } | sendmail "$ALERT_EMAIL"
        log "INFO" "告警邮件已发送到: $ALERT_EMAIL"
    else
        log "WARNING" "未找到邮件发送工具，无法发送告警邮件"
    fi
}

# 监控模式
monitor_mode() {
    log "INFO" "启动 SSL 证书监控模式..."
    
    while true; do
        log "INFO" "执行定期检查..."
        
        # 执行健康检查
        if ! health_check "false"; then
            log "ERROR" "健康检查失败，发送告警"
            send_alert_email "SSL 健康检查失败" "SSL 证书健康检查发现问题，请及时处理。"
        fi
        
        # 检查过期时间
        if ! check_expiry "$DAYS_BEFORE_EXPIRY" >/dev/null 2>&1; then
            log "WARNING" "证书即将过期，发送告警"
        fi
        
        # 等待下次检查（每小时检查一次）
        log "INFO" "等待下次检查 (1小时后)..."
        sleep 3600
    done
}

# 主函数
main() {
    local command=""
    local verbose=false
    local quiet=false
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -e|--email)
                ALERT_EMAIL="$2"
                shift 2
                ;;
            -d|--days)
                DAYS_BEFORE_EXPIRY="$2"
                shift 2
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            -q|--quiet)
                quiet=true
                shift
                ;;
            status|check-expiry|monitor|health-check|backup|restore|validate|report)
                command="$1"
                shift
                ;;
            *)
                if [[ -z "$command" ]]; then
                    log "ERROR" "未知参数: $1"
                    show_help
                    exit 1
                else
                    # 可能是命令的参数
                    break
                fi
                ;;
        esac
    done
    
    # 设置日志级别
    if [[ "$quiet" == "true" ]]; then
        exec 1>/dev/null
    fi
    
    # 执行命令
    case "$command" in
        status)
            show_status
            ;;
        check-expiry)
            check_expiry "$DAYS_BEFORE_EXPIRY"
            ;;
        monitor)
            monitor_mode
            ;;
        health-check)
            health_check "$verbose"
            ;;
        backup)
            backup_certificates
            ;;
        restore)
            if [[ -z "$1" ]]; then
                log "ERROR" "restore 命令需要备份文件参数"
                exit 1
            fi
            restore_certificates "$1"
            ;;
        validate)
            validate_configuration
            ;;
        report)
            generate_report
            ;;
        "")
            log "ERROR" "请指定命令"
            show_help
            exit 1
            ;;
        *)
            log "ERROR" "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 如果直接运行脚本
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
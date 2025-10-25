#!/bin/bash

# OpenAero 健康监控脚本
# 用于定期检查服务健康状态并发送告警

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/var/log/openaero-health.log"
ALERT_EMAIL="${ALERT_EMAIL:-admin@example.com}"
WEBHOOK_URL="${WEBHOOK_URL:-}"
CHECK_INTERVAL="${CHECK_INTERVAL:-300}"  # 5分钟
MAX_RETRIES=3
TIMEOUT=30

# 服务配置
SERVICES=(
    "app:3000:/api/health"
    "db:5432"
    "redis:6379"
    "nginx:80:/"
)

# 日志函数
log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() {
    log_message "INFO" "$1"
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    log_message "SUCCESS" "$1"
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    log_message "WARNING" "$1"
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    log_message "ERROR" "$1"
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查服务是否运行
check_service_running() {
    local service_name="$1"
    local container_name="openaero-$service_name"
    
    if docker ps --format "table {{.Names}}" | grep -q "^$container_name$"; then
        return 0
    else
        return 1
    fi
}

# 检查端口连通性
check_port_connectivity() {
    local host="$1"
    local port="$2"
    local retries=0
    
    while [ $retries -lt $MAX_RETRIES ]; do
        if timeout $TIMEOUT nc -z "$host" "$port" 2>/dev/null; then
            return 0
        fi
        retries=$((retries + 1))
        sleep 2
    done
    return 1
}

# 检查 HTTP 健康端点
check_http_health() {
    local url="$1"
    local retries=0
    
    while [ $retries -lt $MAX_RETRIES ]; do
        local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url" 2>/dev/null || echo "000")
        if [ "$response" = "200" ]; then
            return 0
        fi
        retries=$((retries + 1))
        sleep 2
    done
    return 1
}

# 检查数据库连接
check_database_health() {
    local retries=0
    
    while [ $retries -lt $MAX_RETRIES ]; do
        if docker exec openaero-db pg_isready -U openaero -d openaero >/dev/null 2>&1; then
            return 0
        fi
        retries=$((retries + 1))
        sleep 2
    done
    return 1
}

# 检查 Redis 连接
check_redis_health() {
    local retries=0
    
    while [ $retries -lt $MAX_RETRIES ]; do
        if docker exec openaero-redis redis-cli ping | grep -q "PONG"; then
            return 0
        fi
        retries=$((retries + 1))
        sleep 2
    done
    return 1
}

# 检查磁盘空间
check_disk_space() {
    local threshold=90
    local usage=$(df "$PROJECT_ROOT" | awk 'NR==2 {print int($5)}')
    
    if [ "$usage" -gt "$threshold" ]; then
        log_warning "磁盘使用率过高: ${usage}%"
        return 1
    fi
    return 0
}

# 检查内存使用
check_memory_usage() {
    local threshold=90
    local usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [ "$usage" -gt "$threshold" ]; then
        log_warning "内存使用率过高: ${usage}%"
        return 1
    fi
    return 0
}

# 检查 CPU 负载
check_cpu_load() {
    local threshold=5.0
    local load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    
    if (( $(echo "$load > $threshold" | bc -l) )); then
        log_warning "CPU 负载过高: $load"
        return 1
    fi
    return 0
}

# 发送邮件告警
send_email_alert() {
    local subject="$1"
    local body="$2"
    
    if [ -n "$ALERT_EMAIL" ] && command -v mail >/dev/null 2>&1; then
        echo "$body" | mail -s "$subject" "$ALERT_EMAIL"
        log_info "邮件告警已发送到 $ALERT_EMAIL"
    fi
}

# 发送 Webhook 告警
send_webhook_alert() {
    local message="$1"
    
    if [ -n "$WEBHOOK_URL" ]; then
        local payload="{\"text\":\"$message\"}"
        curl -X POST -H "Content-Type: application/json" -d "$payload" "$WEBHOOK_URL" >/dev/null 2>&1
        log_info "Webhook 告警已发送"
    fi
}

# 发送告警
send_alert() {
    local service="$1"
    local issue="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    local subject="OpenAero 服务告警: $service"
    local body="时间: $timestamp
服务: $service
问题: $issue
服务器: $(hostname)
项目路径: $PROJECT_ROOT

请及时检查服务状态并采取相应措施。"

    local webhook_message="🚨 OpenAero 告警: $service - $issue ($(hostname))"
    
    send_email_alert "$subject" "$body"
    send_webhook_alert "$webhook_message"
}

# 检查单个服务
check_single_service() {
    local service_config="$1"
    IFS=':' read -r service_name port health_path <<< "$service_config"
    
    log_info "检查服务: $service_name"
    
    # 检查容器是否运行
    if ! check_service_running "$service_name"; then
        log_error "服务 $service_name 容器未运行"
        send_alert "$service_name" "容器未运行"
        return 1
    fi
    
    # 检查端口连通性
    if ! check_port_connectivity "localhost" "$port"; then
        log_error "服务 $service_name 端口 $port 不可达"
        send_alert "$service_name" "端口 $port 不可达"
        return 1
    fi
    
    # 检查 HTTP 健康端点（如果有）
    if [ -n "${health_path:-}" ]; then
        local health_url="http://localhost:$port$health_path"
        if ! check_http_health "$health_url"; then
            log_error "服务 $service_name 健康检查失败: $health_url"
            send_alert "$service_name" "健康检查失败"
            return 1
        fi
    fi
    
    # 特殊检查
    case "$service_name" in
        "db")
            if ! check_database_health; then
                log_error "数据库连接检查失败"
                send_alert "$service_name" "数据库连接失败"
                return 1
            fi
            ;;
        "redis")
            if ! check_redis_health; then
                log_error "Redis 连接检查失败"
                send_alert "$service_name" "Redis 连接失败"
                return 1
            fi
            ;;
    esac
    
    log_success "服务 $service_name 健康检查通过"
    return 0
}

# 检查系统资源
check_system_resources() {
    log_info "检查系统资源..."
    
    local issues=()
    
    if ! check_disk_space; then
        issues+=("磁盘空间不足")
    fi
    
    if ! check_memory_usage; then
        issues+=("内存使用率过高")
    fi
    
    if ! check_cpu_load; then
        issues+=("CPU 负载过高")
    fi
    
    if [ ${#issues[@]} -gt 0 ]; then
        local issue_list=$(IFS=', '; echo "${issues[*]}")
        send_alert "系统资源" "$issue_list"
        return 1
    fi
    
    log_success "系统资源检查通过"
    return 0
}

# 生成健康报告
generate_health_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local report_file="/tmp/openaero-health-report-$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "OpenAero 健康检查报告"
        echo "====================="
        echo "检查时间: $timestamp"
        echo "服务器: $(hostname)"
        echo "项目路径: $PROJECT_ROOT"
        echo ""
        
        echo "服务状态:"
        echo "---------"
        for service_config in "${SERVICES[@]}"; do
            IFS=':' read -r service_name port health_path <<< "$service_config"
            if check_service_running "$service_name"; then
                echo "✓ $service_name: 运行中"
            else
                echo "✗ $service_name: 未运行"
            fi
        done
        echo ""
        
        echo "系统资源:"
        echo "---------"
        echo "磁盘使用率: $(df "$PROJECT_ROOT" | awk 'NR==2 {print $5}')"
        echo "内存使用率: $(free | awk 'NR==2{printf "%.1f%%", $3*100/$2}')"
        echo "CPU 负载: $(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')"
        echo ""
        
        echo "Docker 容器状态:"
        echo "---------------"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep openaero || echo "无 OpenAero 容器运行"
        
    } > "$report_file"
    
    echo "$report_file"
}

# 主健康检查函数
run_health_check() {
    log_info "开始 OpenAero 健康检查..."
    
    local failed_services=()
    local all_healthy=true
    
    # 检查所有服务
    for service_config in "${SERVICES[@]}"; do
        IFS=':' read -r service_name port health_path <<< "$service_config"
        if ! check_single_service "$service_config"; then
            failed_services+=("$service_name")
            all_healthy=false
        fi
    done
    
    # 检查系统资源
    if ! check_system_resources; then
        all_healthy=false
    fi
    
    # 生成报告
    local report_file=$(generate_health_report)
    log_info "健康检查报告已生成: $report_file"
    
    if [ "$all_healthy" = true ]; then
        log_success "所有服务健康检查通过"
        return 0
    else
        log_error "健康检查发现问题，失败的服务: ${failed_services[*]}"
        return 1
    fi
}

# 监控模式（持续运行）
run_monitor_mode() {
    log_info "启动监控模式，检查间隔: ${CHECK_INTERVAL}秒"
    
    while true; do
        run_health_check
        log_info "等待 ${CHECK_INTERVAL} 秒后进行下次检查..."
        sleep "$CHECK_INTERVAL"
    done
}

# 显示帮助信息
show_help() {
    echo "OpenAero 健康监控脚本"
    echo ""
    echo "用法: $0 [命令] [选项]"
    echo ""
    echo "命令:"
    echo "  check     执行一次健康检查（默认）"
    echo "  monitor   持续监控模式"
    echo "  report    生成健康报告"
    echo "  help      显示帮助信息"
    echo ""
    echo "环境变量:"
    echo "  ALERT_EMAIL      告警邮箱地址"
    echo "  WEBHOOK_URL      Webhook 告警地址"
    echo "  CHECK_INTERVAL   监控间隔（秒，默认300）"
    echo ""
    echo "示例:"
    echo "  $0 check"
    echo "  $0 monitor"
    echo "  ALERT_EMAIL=admin@example.com $0 check"
}

# 主函数
main() {
    # 创建日志文件
    sudo touch "$LOG_FILE" 2>/dev/null || LOG_FILE="/tmp/openaero-health.log"
    
    case "${1:-check}" in
        check)
            run_health_check
            ;;
        monitor)
            run_monitor_mode
            ;;
        report)
            local report_file=$(generate_health_report)
            echo "健康报告已生成: $report_file"
            cat "$report_file"
            ;;
        help)
            show_help
            ;;
        *)
            log_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
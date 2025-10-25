#!/bin/bash

# OpenAero 监控和告警系统设置脚本
# 用于配置 Prometheus, Grafana, 和 Alertmanager

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MONITORING_DIR="$PROJECT_ROOT/monitoring"
GRAFANA_ADMIN_PASSWORD="${GRAFANA_ADMIN_PASSWORD:-admin123}"
ALERT_EMAIL="${ALERT_EMAIL:-admin@example.com}"
SMTP_HOST="${SMTP_HOST:-smtp.gmail.com}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_USER="${SMTP_USER:-}"
SMTP_PASSWORD="${SMTP_PASSWORD:-}"

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

# 检查系统要求
check_requirements() {
    log_info "检查系统要求..."
    
    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    # 检查 Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    # 检查磁盘空间
    available_space=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 2097152 ]; then  # 2GB in KB
        log_warning "可用磁盘空间不足 2GB，监控数据可能会很快填满磁盘"
    fi
    
    log_success "系统要求检查完成"
}

# 创建监控目录结构
create_monitoring_structure() {
    log_info "创建监控目录结构..."
    
    mkdir -p "$MONITORING_DIR"/{prometheus,grafana,alertmanager}/{config,data}
    mkdir -p "$MONITORING_DIR"/grafana/dashboards
    mkdir -p "$MONITORING_DIR"/grafana/provisioning/{dashboards,datasources}
    
    # 设置权限
    chmod -R 755 "$MONITORING_DIR"
    
    log_success "监控目录结构创建完成"
}

# 生成 Prometheus 配置
generate_prometheus_config() {
    log_info "生成 Prometheus 配置..."
    
    cat > "$MONITORING_DIR/prometheus/config/prometheus.yml" << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']

  - job_name: 'openaero-app'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 30s

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'nginx-exporter'
    static_configs:
      - targets: ['nginx-exporter:9113']
EOF

    log_success "Prometheus 配置生成完成"
}

# 生成 Prometheus 告警规则
generate_alert_rules() {
    log_info "生成 Prometheus 告警规则..."
    
    cat > "$MONITORING_DIR/prometheus/config/alert_rules.yml" << 'EOF'
groups:
  - name: openaero_alerts
    rules:
      # 服务可用性告警
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "Service {{ $labels.job }} has been down for more than 1 minute."

      # 高 CPU 使用率告警
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is above 80% for more than 5 minutes."

      # 高内存使用率告警
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is above 85% for more than 5 minutes."

      # 磁盘空间不足告警
      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 < 10
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Disk space low on {{ $labels.instance }}"
          description: "Disk space is below 10% on {{ $labels.device }}."

      # 应用响应时间告警
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time for OpenAero"
          description: "95th percentile response time is above 2 seconds."

      # 数据库连接告警
      - alert: DatabaseConnectionHigh
        expr: pg_stat_activity_count > 80
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High database connections"
          description: "PostgreSQL has more than 80 active connections."

      # Redis 内存使用告警
      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes * 100 > 90
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Redis memory usage high"
          description: "Redis memory usage is above 90%."

      # SSL 证书过期告警
      - alert: SSLCertificateExpiry
        expr: probe_ssl_earliest_cert_expiry - time() < 86400 * 7
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "SSL certificate expiring soon"
          description: "SSL certificate will expire in less than 7 days."
EOF

    log_success "Prometheus 告警规则生成完成"
}

# 生成 Alertmanager 配置
generate_alertmanager_config() {
    log_info "生成 Alertmanager 配置..."
    
    cat > "$MONITORING_DIR/alertmanager/config/alertmanager.yml" << EOF
global:
  smtp_smarthost: '$SMTP_HOST:$SMTP_PORT'
  smtp_from: '$SMTP_USER'
  smtp_auth_username: '$SMTP_USER'
  smtp_auth_password: '$SMTP_PASSWORD'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
  - name: 'web.hook'
    email_configs:
      - to: '$ALERT_EMAIL'
        subject: 'OpenAero Alert: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Labels: {{ range .Labels.SortedPairs }}{{ .Name }}={{ .Value }} {{ end }}
          {{ end }}

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
EOF

    log_success "Alertmanager 配置生成完成"
}

# 生成 Grafana 数据源配置
generate_grafana_datasource() {
    log_info "生成 Grafana 数据源配置..."
    
    cat > "$MONITORING_DIR/grafana/provisioning/datasources/prometheus.yml" << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF

    log_success "Grafana 数据源配置生成完成"
}

# 生成 Grafana 仪表板配置
generate_grafana_dashboard_config() {
    log_info "生成 Grafana 仪表板配置..."
    
    cat > "$MONITORING_DIR/grafana/provisioning/dashboards/dashboard.yml" << 'EOF'
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
EOF

    log_success "Grafana 仪表板配置生成完成"
}

# 生成 Docker Compose 监控配置
generate_monitoring_compose() {
    log_info "生成监控 Docker Compose 配置..."
    
    cat > "$MONITORING_DIR/docker-compose.monitoring.yml" << 'EOF'
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: openaero-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/config:/etc/prometheus
      - ./prometheus/data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    networks:
      - monitoring
    restart: unless-stopped

  alertmanager:
    image: prom/alertmanager:latest
    container_name: openaero-alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager/config:/etc/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
      - '--web.external-url=http://localhost:9093'
    networks:
      - monitoring
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: openaero-grafana
    ports:
      - "3001:3000"
    volumes:
      - ./grafana/data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
    networks:
      - monitoring
    restart: unless-stopped

  node-exporter:
    image: prom/node-exporter:latest
    container_name: openaero-node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - monitoring
    restart: unless-stopped

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: openaero-cadvisor
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:rw
      - /sys:/sys:ro
      - /var/lib/docker:/var/lib/docker:ro
    networks:
      - monitoring
    restart: unless-stopped

  postgres-exporter:
    image: prometheuscommunity/postgres-exporter:latest
    container_name: openaero-postgres-exporter
    ports:
      - "9187:9187"
    environment:
      - DATA_SOURCE_NAME=postgresql://openaero:${POSTGRES_PASSWORD}@db:5432/openaero?sslmode=disable
    networks:
      - monitoring
      - openaero_default
    restart: unless-stopped

  redis-exporter:
    image: oliver006/redis_exporter:latest
    container_name: openaero-redis-exporter
    ports:
      - "9121:9121"
    environment:
      - REDIS_ADDR=redis://redis:6379
    networks:
      - monitoring
      - openaero_default
    restart: unless-stopped

networks:
  monitoring:
    driver: bridge
  openaero_default:
    external: true
EOF

    log_success "监控 Docker Compose 配置生成完成"
}

# 生成监控启动脚本
generate_monitoring_script() {
    log_info "生成监控管理脚本..."
    
    cat > "$MONITORING_DIR/monitoring.sh" << 'EOF'
#!/bin/bash

# OpenAero 监控系统管理脚本

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.monitoring.yml"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
    echo "OpenAero 监控系统管理脚本"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  start     启动监控服务"
    echo "  stop      停止监控服务"
    echo "  restart   重启监控服务"
    echo "  status    查看服务状态"
    echo "  logs      查看服务日志"
    echo "  update    更新监控配置"
    echo "  backup    备份监控数据"
    echo "  help      显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 start"
    echo "  $0 logs prometheus"
    echo "  $0 backup"
}

start_monitoring() {
    log_info "启动监控服务..."
    cd "$SCRIPT_DIR"
    docker-compose -f "$COMPOSE_FILE" up -d
    log_success "监控服务启动完成"
    echo ""
    echo "访问地址:"
    echo "  Grafana:     http://localhost:3001 (admin/admin123)"
    echo "  Prometheus:  http://localhost:9090"
    echo "  Alertmanager: http://localhost:9093"
}

stop_monitoring() {
    log_info "停止监控服务..."
    cd "$SCRIPT_DIR"
    docker-compose -f "$COMPOSE_FILE" down
    log_success "监控服务已停止"
}

restart_monitoring() {
    log_info "重启监控服务..."
    stop_monitoring
    start_monitoring
}

show_status() {
    log_info "监控服务状态:"
    cd "$SCRIPT_DIR"
    docker-compose -f "$COMPOSE_FILE" ps
}

show_logs() {
    local service=${1:-}
    cd "$SCRIPT_DIR"
    if [ -n "$service" ]; then
        docker-compose -f "$COMPOSE_FILE" logs -f "$service"
    else
        docker-compose -f "$COMPOSE_FILE" logs -f
    fi
}

update_config() {
    log_info "重新加载配置..."
    cd "$SCRIPT_DIR"
    docker-compose -f "$COMPOSE_FILE" exec prometheus kill -HUP 1
    docker-compose -f "$COMPOSE_FILE" exec alertmanager kill -HUP 1
    log_success "配置重新加载完成"
}

backup_data() {
    log_info "备份监控数据..."
    local backup_dir="backup/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # 备份 Prometheus 数据
    if [ -d "$SCRIPT_DIR/prometheus/data" ]; then
        cp -r "$SCRIPT_DIR/prometheus/data" "$backup_dir/prometheus_data"
    fi
    
    # 备份 Grafana 数据
    if [ -d "$SCRIPT_DIR/grafana/data" ]; then
        cp -r "$SCRIPT_DIR/grafana/data" "$backup_dir/grafana_data"
    fi
    
    # 备份配置文件
    cp -r "$SCRIPT_DIR/prometheus/config" "$backup_dir/prometheus_config"
    cp -r "$SCRIPT_DIR/alertmanager/config" "$backup_dir/alertmanager_config"
    cp -r "$SCRIPT_DIR/grafana/provisioning" "$backup_dir/grafana_provisioning"
    
    log_success "监控数据备份完成: $backup_dir"
}

case "${1:-help}" in
    start)
        start_monitoring
        ;;
    stop)
        stop_monitoring
        ;;
    restart)
        restart_monitoring
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "${2:-}"
        ;;
    update)
        update_config
        ;;
    backup)
        backup_data
        ;;
    help|*)
        show_help
        ;;
esac
EOF

    chmod +x "$MONITORING_DIR/monitoring.sh"
    log_success "监控管理脚本生成完成"
}

# 生成环境变量模板
generate_monitoring_env() {
    log_info "生成监控环境变量模板..."
    
    cat > "$MONITORING_DIR/.env.monitoring" << EOF
# Grafana 配置
GRAFANA_ADMIN_PASSWORD=$GRAFANA_ADMIN_PASSWORD

# 邮件告警配置
ALERT_EMAIL=$ALERT_EMAIL
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASSWORD=$SMTP_PASSWORD

# 数据库配置（用于 postgres-exporter）
POSTGRES_PASSWORD=\${POSTGRES_PASSWORD}
EOF

    log_success "监控环境变量模板生成完成"
}

# 主函数
main() {
    case "${1:-setup}" in
        setup)
            log_info "开始设置监控和告警系统..."
            check_requirements
            create_monitoring_structure
            generate_prometheus_config
            generate_alert_rules
            generate_alertmanager_config
            generate_grafana_datasource
            generate_grafana_dashboard_config
            generate_monitoring_compose
            generate_monitoring_script
            generate_monitoring_env
            log_success "监控和告警系统设置完成！"
            echo ""
            echo "下一步操作："
            echo "1. 编辑 $MONITORING_DIR/.env.monitoring 配置邮件告警"
            echo "2. 运行 cd $MONITORING_DIR && ./monitoring.sh start 启动监控服务"
            echo "3. 访问 http://localhost:3001 配置 Grafana 仪表板"
            ;;
        help)
            echo "OpenAero 监控系统设置脚本"
            echo ""
            echo "用法: $0 [命令]"
            echo ""
            echo "命令:"
            echo "  setup     设置监控系统（默认）"
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
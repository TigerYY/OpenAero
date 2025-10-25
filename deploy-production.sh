#!/bin/bash

# OpenAero 生产环境部署脚本
# 使用Docker Compose进行部署

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
PROJECT_NAME="openaero"
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"
BACKUP_DIR="./backups"
LOG_FILE="./logs/deploy-$(date +%Y%m%d_%H%M%S).log"

# 创建日志目录
mkdir -p logs

# 日志函数
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_FILE"
}

# 检查必要文件
check_requirements() {
    log "检查部署要求..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker 未安装"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose 未安装"
        exit 1
    fi
    
    if [ ! -f "$COMPOSE_FILE" ]; then
        error "Docker Compose 配置文件不存在: $COMPOSE_FILE"
        exit 1
    fi
    
    if [ ! -f "$ENV_FILE" ]; then
        error "环境配置文件不存在: $ENV_FILE"
        exit 1
    fi
    
    log "✅ 所有要求检查通过"
}

# 备份数据
backup_data() {
    log "开始数据备份..."
    
    mkdir -p "$BACKUP_DIR"
    
    # 备份数据库
    if docker-compose -f "$COMPOSE_FILE" ps db | grep -q "Up"; then
        info "备份PostgreSQL数据库..."
        docker-compose -f "$COMPOSE_FILE" exec -T db pg_dump -U openaero openaero > "$BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).sql"
        log "✅ 数据库备份完成"
    else
        warning "数据库容器未运行，跳过备份"
    fi
    
    # 备份Redis数据
    if docker-compose -f "$COMPOSE_FILE" ps redis | grep -q "Up"; then
        info "备份Redis数据..."
        docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli BGSAVE
        log "✅ Redis备份完成"
    else
        warning "Redis容器未运行，跳过备份"
    fi
}

# 构建镜像
build_images() {
    log "开始构建Docker镜像..."
    
    # 清理旧的构建缓存
    docker builder prune -f
    
    # 构建应用镜像
    docker-compose -f "$COMPOSE_FILE" build --no-cache app
    
    log "✅ 镜像构建完成"
}

# 部署服务
deploy_services() {
    log "开始部署服务..."
    
    # 停止旧服务
    info "停止现有服务..."
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans
    
    # 启动新服务
    info "启动新服务..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    log "✅ 服务部署完成"
}

# 健康检查
health_check() {
    log "开始健康检查..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        info "健康检查尝试 $attempt/$max_attempts"
        
        if curl -f -s http://localhost:3000/api/health > /dev/null; then
            log "✅ 应用健康检查通过"
            return 0
        fi
        
        sleep 10
        ((attempt++))
    done
    
    error "健康检查失败，应用可能未正常启动"
    return 1
}

# 显示服务状态
show_status() {
    log "显示服务状态..."
    
    echo -e "\n${BLUE}=== 服务状态 ===${NC}"
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo -e "\n${BLUE}=== 资源使用情况 ===${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
    
    echo -e "\n${BLUE}=== 访问信息 ===${NC}"
    echo "应用地址: http://localhost:3000"
    echo "健康检查: http://localhost:3000/api/health"
    echo "Nginx状态: http://localhost:80"
}

# 清理函数
cleanup() {
    log "清理临时文件..."
    docker system prune -f
    log "✅ 清理完成"
}

# 回滚函数
rollback() {
    error "部署失败，开始回滚..."
    
    # 停止当前服务
    docker-compose -f "$COMPOSE_FILE" down
    
    # 这里可以添加回滚到上一个版本的逻辑
    warning "请手动检查并修复问题后重新部署"
    
    exit 1
}

# 主函数
main() {
    log "开始 OpenAero 生产环境部署"
    
    # 设置错误处理
    trap rollback ERR
    
    check_requirements
    backup_data
    build_images
    deploy_services
    
    if health_check; then
        show_status
        cleanup
        log "🎉 部署成功完成！"
    else
        rollback
    fi
}

# 处理命令行参数
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "status")
        show_status
        ;;
    "logs")
        docker-compose -f "$COMPOSE_FILE" logs -f "${2:-app}"
        ;;
    "stop")
        log "停止所有服务..."
        docker-compose -f "$COMPOSE_FILE" down
        log "✅ 服务已停止"
        ;;
    "restart")
        log "重启服务..."
        docker-compose -f "$COMPOSE_FILE" restart "${2:-}"
        log "✅ 服务已重启"
        ;;
    "backup")
        backup_data
        ;;
    "cleanup")
        cleanup
        ;;
    *)
        echo "用法: $0 {deploy|status|logs|stop|restart|backup|cleanup}"
        echo ""
        echo "命令说明:"
        echo "  deploy   - 完整部署流程（默认）"
        echo "  status   - 显示服务状态"
        echo "  logs     - 查看服务日志"
        echo "  stop     - 停止所有服务"
        echo "  restart  - 重启服务"
        echo "  backup   - 备份数据"
        echo "  cleanup  - 清理系统"
        exit 1
        ;;
esac
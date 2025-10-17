#!/bin/bash

# 开元空御部署脚本
# 使用方法: ./scripts/deploy.sh [environment] [version]
# 环境: dev, staging, production
# 版本: 可选，默认为latest

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

# 检查参数
ENVIRONMENT=${1:-dev}
VERSION=${2:-latest}

# 验证环境参数
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|production)$ ]]; then
    error "无效的环境参数: $ENVIRONMENT. 请使用: dev, staging, production"
fi

log "开始部署开元空御到 $ENVIRONMENT 环境 (版本: $VERSION)"

# 检查必要工具
check_requirements() {
    log "检查部署要求..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker 未安装或未在PATH中"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose 未安装或未在PATH中"
    fi
    
    if ! command -v git &> /dev/null; then
        error "Git 未安装或未在PATH中"
    fi
    
    success "所有要求检查通过"
}

# 环境配置
setup_environment() {
    log "设置 $ENVIRONMENT 环境配置..."
    
    case $ENVIRONMENT in
        dev)
            COMPOSE_FILE="docker-compose.dev.yml"
            ENV_FILE=".env.local"
            ;;
        staging)
            COMPOSE_FILE="docker-compose.yml"
            ENV_FILE=".env.staging"
            ;;
        production)
            COMPOSE_FILE="docker-compose.yml"
            ENV_FILE=".env.production"
            ;;
    esac
    
    if [ ! -f "$ENV_FILE" ]; then
        warning "环境文件 $ENV_FILE 不存在，使用默认配置"
        ENV_FILE=".env.example"
    fi
    
    success "环境配置完成: $COMPOSE_FILE, $ENV_FILE"
}

# 构建镜像
build_image() {
    log "构建Docker镜像..."
    
    if [ "$ENVIRONMENT" = "dev" ]; then
        docker-compose -f $COMPOSE_FILE build --no-cache
    else
        docker build -t openaero-web:$VERSION .
    fi
    
    success "Docker镜像构建完成"
}

# 运行测试
run_tests() {
    if [ "$ENVIRONMENT" = "dev" ]; then
        log "跳过测试 (开发环境)"
        return
    fi
    
    log "运行测试..."
    
    # 单元测试
    docker-compose -f $COMPOSE_FILE run --rm app npm run test:coverage
    
    # E2E测试
    docker-compose -f $COMPOSE_FILE run --rm app npm run test:e2e
    
    success "所有测试通过"
}

# 数据库迁移
run_migrations() {
    log "运行数据库迁移..."
    
    if [ "$ENVIRONMENT" = "dev" ]; then
        docker-compose -f $COMPOSE_FILE run --rm app npm run db:migrate
    else
        docker-compose -f $COMPOSE_FILE run --rm app npm run db:migrate
    fi
    
    success "数据库迁移完成"
}

# 停止现有服务
stop_services() {
    log "停止现有服务..."
    
    docker-compose -f $COMPOSE_FILE down --remove-orphans
    
    success "现有服务已停止"
}

# 启动服务
start_services() {
    log "启动 $ENVIRONMENT 环境服务..."
    
    if [ "$ENVIRONMENT" = "dev" ]; then
        docker-compose -f $COMPOSE_FILE up -d
    else
        docker-compose -f $COMPOSE_FILE up -d --scale app=2
    fi
    
    success "服务启动完成"
}

# 健康检查
health_check() {
    log "执行健康检查..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            success "健康检查通过"
            return 0
        fi
        
        log "健康检查尝试 $attempt/$max_attempts..."
        sleep 10
        ((attempt++))
    done
    
    error "健康检查失败，服务可能未正常启动"
}

# 清理旧镜像
cleanup() {
    log "清理旧Docker镜像..."
    
    # 删除悬空镜像
    docker image prune -f
    
    # 删除未使用的镜像
    docker image prune -a -f --filter "until=24h"
    
    success "清理完成"
}

# 显示部署信息
show_deployment_info() {
    log "部署信息:"
    echo "  环境: $ENVIRONMENT"
    echo "  版本: $VERSION"
    echo "  应用URL: http://localhost:3000"
    echo "  健康检查: http://localhost:3000/health"
    
    if [ "$ENVIRONMENT" = "dev" ]; then
        echo "  数据库管理: http://localhost:8080"
    fi
    
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "  监控面板: http://localhost:3001"
    fi
}

# 主部署流程
main() {
    log "🚀 开始开元空御部署流程"
    
    check_requirements
    setup_environment
    stop_services
    build_image
    run_tests
    run_migrations
    start_services
    health_check
    cleanup
    show_deployment_info
    
    success "🎉 部署完成！开元空御已成功部署到 $ENVIRONMENT 环境"
}

# 错误处理
trap 'error "部署过程中发生错误，请检查日志"' ERR

# 执行主流程
main "$@"

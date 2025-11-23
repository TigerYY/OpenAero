#!/bin/bash
# 容器注册表部署流程测试脚本
# 逐步验证各个功能

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试结果
PASSED=0
FAILED=0

# 打印测试步骤
print_step() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# 打印成功
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

# 打印失败
print_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
}

# 打印警告
print_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 打印信息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 测试 1: 环境检查
test_environment() {
    print_step "测试 1: 环境检查"
    
    # 检查 Docker
    if docker info >/dev/null 2>&1; then
        print_success "Docker 正在运行"
    else
        print_fail "Docker 未运行"
        return 1
    fi
    
    # 检查脚本文件
    local scripts=(
        "scripts/deploy-from-registry.sh"
        "scripts/setup-registry-auth.sh"
        "scripts/build-and-push.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [ -f "$script" ] && [ -x "$script" ]; then
            print_success "脚本存在且可执行: $script"
        else
            print_fail "脚本不存在或不可执行: $script"
        fi
    done
    
    # 检查 Docker Compose 配置
    if [ -f "docker-compose.registry.yml" ]; then
        print_success "Docker Compose 配置存在"
    else
        print_fail "Docker Compose 配置不存在"
    fi
    
    # 检查 GitHub 仓库信息
    if git remote -v | grep -q "github.com"; then
        local repo=$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')
        print_success "GitHub 仓库: $repo"
        export GITHUB_REPO="$repo"
    else
        print_warn "未检测到 GitHub 仓库"
    fi
}

# 测试 2: 脚本语法检查
test_script_syntax() {
    print_step "测试 2: 脚本语法检查"
    
    local scripts=(
        "scripts/deploy-from-registry.sh"
        "scripts/setup-registry-auth.sh"
        "scripts/build-and-push.sh"
    )
    
    for script in "${scripts[@]}"; do
        if bash -n "$script" 2>/dev/null; then
            print_success "语法正确: $script"
        else
            print_fail "语法错误: $script"
            bash -n "$script"
        fi
    done
}

# 测试 3: Docker Compose 配置验证
test_compose_config() {
    print_step "测试 3: Docker Compose 配置验证"
    
    if docker compose -f docker-compose.registry.yml config >/dev/null 2>&1; then
        print_success "Docker Compose 配置有效"
        
        # 检查镜像配置
        local image=$(docker compose -f docker-compose.registry.yml config | grep -A 1 "image:" | grep -v "image:" | tr -d ' ' || echo "")
        if [ -n "$image" ]; then
            print_info "配置的镜像: $image"
        fi
    else
        print_fail "Docker Compose 配置无效"
        docker compose -f docker-compose.registry.yml config
    fi
}

# 测试 4: 本地镜像构建测试（不推送）
test_local_build() {
    print_step "测试 4: 本地镜像构建测试"
    
    local test_image="openaero-web:test-$(date +%Y%m%d-%H%M%S)"
    print_info "构建测试镜像: $test_image"
    
    if docker build \
        -f Dockerfile.production \
        -t "$test_image" \
        --quiet \
        . >/dev/null 2>&1; then
        print_success "镜像构建成功: $test_image"
        
        # 检查镜像大小
        local size=$(docker images "$test_image" --format "{{.Size}}")
        print_info "镜像大小: $size"
        
        # 清理测试镜像
        docker rmi "$test_image" >/dev/null 2>&1 || true
        print_info "已清理测试镜像"
    else
        print_fail "镜像构建失败"
        return 1
    fi
}

# 测试 5: 注册表认证检查
test_registry_auth() {
    print_step "测试 5: 注册表认证检查"
    
    # 检查是否已登录 GitHub Container Registry
    if docker info 2>/dev/null | grep -q "ghcr.io"; then
        print_success "已登录 GitHub Container Registry"
    else
        print_warn "未登录 GitHub Container Registry"
        print_info "要登录，请运行:"
        echo "  ./scripts/setup-registry-auth.sh ghcr.io your-github-username"
        echo "  或"
        echo "  echo \$GITHUB_TOKEN | docker login ghcr.io -u your-username --password-stdin"
    fi
    
    # 检查是否已登录 Docker Hub
    if docker info 2>/dev/null | grep -q "docker.io"; then
        print_success "已登录 Docker Hub"
    else
        print_info "未登录 Docker Hub（可选）"
    fi
}

# 测试 6: 部署脚本功能测试（模拟）
test_deploy_script() {
    print_step "测试 6: 部署脚本功能测试（模拟）"
    
    # 检查脚本中的关键功能
    local script="scripts/deploy-from-registry.sh"
    
    # 检查是否包含必要的功能
    if grep -q "docker pull" "$script"; then
        print_success "包含镜像拉取功能"
    else
        print_fail "缺少镜像拉取功能"
    fi
    
    if grep -q "docker compose" "$script"; then
        print_success "包含 Docker Compose 部署功能"
    else
        print_fail "缺少 Docker Compose 部署功能"
    fi
    
    if grep -q "health" "$script"; then
        print_success "包含健康检查功能"
    else
        print_warn "缺少健康检查功能"
    fi
}

# 生成测试报告
generate_report() {
    print_step "测试报告"
    
    local total=$((PASSED + FAILED))
    local pass_rate=0
    
    if [ $total -gt 0 ]; then
        pass_rate=$((PASSED * 100 / total))
    fi
    
    echo -e "总测试数: $total"
    echo -e "${GREEN}通过: $PASSED${NC}"
    echo -e "${RED}失败: $FAILED${NC}"
    echo -e "通过率: ${pass_rate}%"
    
    if [ $FAILED -eq 0 ]; then
        echo -e "\n${GREEN}✅ 所有测试通过！${NC}"
        echo -e "\n下一步："
        echo "1. 设置注册表认证: ./scripts/setup-registry-auth.sh ghcr.io your-username"
        echo "2. 构建并推送镜像: DOCKER_REGISTRY=ghcr.io DOCKER_USERNAME=your-username ./scripts/build-and-push.sh"
        echo "3. 测试部署: export DOCKER_IMAGE=ghcr.io/your-username/openaero-web:latest && ./scripts/deploy-from-registry.sh"
        return 0
    else
        echo -e "\n${RED}❌ 部分测试失败，请修复后重试${NC}"
        return 1
    fi
}

# 主函数
main() {
    echo -e "${BLUE}"
    echo "=========================================="
    echo "  容器注册表部署流程测试"
    echo "=========================================="
    echo -e "${NC}"
    
    test_environment
    test_script_syntax
    test_compose_config
    test_local_build
    test_registry_auth
    test_deploy_script
    
    generate_report
}

# 运行测试
main "$@"


#!/bin/bash

# Spec-Kit 管理脚本
# 用于简化 Spec-Kit 相关操作

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 检查 specify 命令是否存在
check_specify() {
    if ! command -v specify &> /dev/null; then
        echo -e "${RED}错误: specify 命令未找到，请先安装 specify${NC}"
        echo "安装命令: pipx install specify"
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    echo -e "${BLUE}Spec-Kit 管理脚本${NC}"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  init        初始化 Spec-Kit"
    echo "  create      创建新的功能规范"
    echo "  list        列出所有规范"
    echo "  check       检查 Spec-Kit 状态"
    echo "  help        显示此帮助信息"
    echo "  status      显示项目状态"
    echo ""
    echo "示例:"
    echo "  $0 init"
    echo "  $0 create user-management"
    echo "  $0 list"
}

# 初始化 Spec-Kit
init_speckit() {
    echo -e "${YELLOW}正在初始化 Spec-Kit...${NC}"
    check_specify
    
    cd "$PROJECT_ROOT"
    
    # 检查是否已经初始化
    if [ -d ".specify" ] && [ -d "specs" ]; then
        echo -e "${GREEN}Spec-Kit 已经初始化${NC}"
        return 0
    fi
    
    # 创建目录结构
    mkdir -p .specify specs
    
    echo -e "${GREEN}Spec-Kit 初始化完成${NC}"
    echo "目录结构已创建:"
    echo "  .specify/     - 配置文件目录"
    echo "  specs/        - 规范文档目录"
}

# 创建新的功能规范
new_spec() {
    local feature_name="$1"
    
    if [ -z "$feature_name" ]; then
        echo -e "${RED}错误: 请提供功能名称${NC}"
        echo "用法: $0 new <功能名称>"
        exit 1
    fi
    
    echo -e "${YELLOW}正在创建功能规范: $feature_name${NC}"
    check_specify
    
    cd "$PROJECT_ROOT"
    
    # 创建功能目录
    local spec_dir="specs/$feature_name"
    mkdir -p "$spec_dir"
    
    # 复制模板文件
    if [ -f ".specify/feature-template.md" ]; then
        cp ".specify/feature-template.md" "$spec_dir/spec.md"
        echo -e "${GREEN}已创建: $spec_dir/spec.md${NC}"
    fi
    
    if [ -f ".specify/plan-template.md" ]; then
        cp ".specify/plan-template.md" "$spec_dir/plan.md"
        echo -e "${GREEN}已创建: $spec_dir/plan.md${NC}"
    fi
    
    if [ -f ".specify/task-template.md" ]; then
        cp ".specify/task-template.md" "$spec_dir/tasks.md"
        echo -e "${GREEN}已创建: $spec_dir/tasks.md${NC}"
    fi
    
    echo -e "${GREEN}功能规范创建完成: $feature_name${NC}"
    echo "请编辑以下文件:"
    echo "  $spec_dir/spec.md    - 功能规范"
    echo "  $spec_dir/plan.md    - 技术实施计划"
    echo "  $spec_dir/tasks.md   - 任务清单"
}

# 列出所有规范
list_specs() {
    echo -e "${BLUE}功能规范列表:${NC}"
    echo ""
    
    if [ ! -d "specs" ]; then
        echo -e "${YELLOW}specs 目录不存在${NC}"
        return 0
    fi
    
    local count=0
    for spec_dir in specs/*/; do
        if [ -d "$spec_dir" ]; then
            local spec_name=$(basename "$spec_dir")
            local spec_file="$spec_dir/spec.md"
            local plan_file="$spec_dir/plan.md"
            local tasks_file="$spec_dir/tasks.md"
            
            echo -e "${GREEN}📁 $spec_name${NC}"
            
            if [ -f "$spec_file" ]; then
                echo -e "  ✅ spec.md"
            else
                echo -e "  ❌ spec.md"
            fi
            
            if [ -f "$plan_file" ]; then
                echo -e "  ✅ plan.md"
            else
                echo -e "  ❌ plan.md"
            fi
            
            if [ -f "$tasks_file" ]; then
                echo -e "  ✅ tasks.md"
            else
                echo -e "  ❌ tasks.md"
            fi
            
            echo ""
            ((count++))
        fi
    done
    
    if [ $count -eq 0 ]; then
        echo -e "${YELLOW}没有找到任何功能规范${NC}"
    else
        echo -e "${BLUE}总计: $count 个功能规范${NC}"
    fi
}

# 检查 Spec-Kit 状态
check_speckit() {
    echo -e "${BLUE}检查 Spec-Kit 状态...${NC}"
    echo ""
    
    # 检查 specify 命令
    if command -v specify &> /dev/null; then
        echo -e "${GREEN}✅ specify 命令可用${NC}"
    else
        echo -e "${RED}❌ specify 命令不可用${NC}"
        return 1
    fi
    
    # 检查配置文件
    if [ -d ".specify" ]; then
        echo -e "${GREEN}✅ 配置目录存在${NC}"
    else
        echo -e "${RED}❌ 配置目录不存在${NC}"
    fi
    
    # 检查规范目录
    if [ -d "specs" ]; then
        echo -e "${GREEN}✅ 规范目录存在${NC}"
    else
        echo -e "${RED}❌ 规范目录不存在${NC}"
    fi
    
    # 检查模板文件
    local templates=("feature-template.md" "plan-template.md" "task-template.md")
    for template in "${templates[@]}"; do
        if [ -f ".specify/$template" ]; then
            echo -e "${GREEN}✅ $template${NC}"
        else
            echo -e "${RED}❌ $template${NC}"
        fi
    done
    
    echo ""
    echo -e "${BLUE}规范统计:${NC}"
    list_specs
}

# 显示项目状态
show_status() {
    echo -e "${BLUE}项目状态${NC}"
    echo ""
    echo -e "${YELLOW}项目路径:${NC} $PROJECT_ROOT"
    echo ""
    
    # 检查 specify
    if command -v specify &> /dev/null; then
        echo -e "${GREEN}✅ specify 已安装${NC}"
    else
        echo -e "${RED}❌ specify 未安装${NC}"
        echo "安装命令: pipx install specify"
    fi
    
    echo ""
    check_speckit
}

# 主函数
main() {
    case "${1:-help}" in
        "init")
            init_speckit
            ;;
        "create")
            new_spec "$2"
            ;;
        "list")
            list_specs
            ;;
        "check")
            check_speckit
            ;;
        "status")
            show_status
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            echo -e "${RED}未知命令: $1${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"

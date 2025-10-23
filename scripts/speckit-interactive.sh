#!/bin/bash

# Spec-Kit 交互式命令脚本
# 支持在 VS Code 任务中交互式输入参数

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 显示帮助
show_help() {
    echo -e "${BLUE}🔧 Spec-Kit 交互式命令${NC}"
    echo ""
    echo "可用命令:"
    echo "  analyze      - 分析项目状态"
    echo "  checklist    - 显示规范清单"
    echo "  clarify      - 显示帮助信息"
    echo "  constitution - 检查配置状态"
    echo "  implement    - 创建功能实现"
    echo "  plan         - 创建技术计划"
    echo "  specify      - 创建功能规范"
    echo "  tasks        - 创建任务清单"
    echo "  setup        - 设置命令别名"
    echo "  load         - 加载命令别名"
    echo ""
    echo "用法: $0 <命令> [参数]"
}

# 分析项目状态
analyze() {
    echo -e "${YELLOW}🔍 分析项目状态...${NC}"
    npm run spec:status
}

# 显示规范清单
checklist() {
    echo -e "${YELLOW}📋 显示规范清单...${NC}"
    npm run spec:list
}

# 显示帮助信息
clarify() {
    echo -e "${YELLOW}❓ 显示帮助信息...${NC}"
    npm run spec:help
}

# 检查配置状态
constitution() {
    echo -e "${YELLOW}⚙️ 检查配置状态...${NC}"
    npm run spec:check
}

# 创建功能实现
implement() {
    echo -e "${YELLOW}🚀 创建功能实现...${NC}"
    if [ -z "$1" ]; then
        echo -e "${YELLOW}请输入功能名称:${NC}"
        read -p "功能名称: " feature_name
        if [ -z "$feature_name" ]; then
            echo -e "${RED}错误: 功能名称不能为空${NC}"
            return 1
        fi
    else
        feature_name="$1"
    fi
    npm run spec:create "$feature_name"
}

# 创建技术计划
plan() {
    echo -e "${YELLOW}📊 创建技术计划...${NC}"
    if [ -z "$1" ]; then
        echo -e "${YELLOW}请输入功能名称:${NC}"
        read -p "功能名称: " feature_name
        if [ -z "$feature_name" ]; then
            echo -e "${RED}错误: 功能名称不能为空${NC}"
            return 1
        fi
    else
        feature_name="$1"
    fi
    npm run spec:create "$feature_name"
}

# 创建功能规范
specify() {
    echo -e "${YELLOW}📝 创建功能规范...${NC}"
    if [ -z "$1" ]; then
        echo -e "${YELLOW}请输入功能名称:${NC}"
        read -p "功能名称: " feature_name
        if [ -z "$feature_name" ]; then
            echo -e "${RED}错误: 功能名称不能为空${NC}"
            return 1
        fi
    else
        feature_name="$1"
    fi
    npm run spec:create "$feature_name"
}

# 创建任务清单
tasks() {
    echo -e "${YELLOW}✅ 创建任务清单...${NC}"
    if [ -z "$1" ]; then
        echo -e "${YELLOW}请输入功能名称:${NC}"
        read -p "功能名称: " feature_name
        if [ -z "$feature_name" ]; then
            echo -e "${RED}错误: 功能名称不能为空${NC}"
            return 1
        fi
    else
        feature_name="$1"
    fi
    npm run spec:create "$feature_name"
}

# 设置命令别名
setup() {
    echo -e "${YELLOW}⚙️ 设置命令别名...${NC}"
    npm run spec:setup
}

# 加载命令别名
load() {
    echo -e "${YELLOW}🔄 加载命令别名...${NC}"
    npm run spec:load
}

# 主函数
main() {
    case "${1:-help}" in
        "analyze")
            analyze
            ;;
        "checklist")
            checklist
            ;;
        "clarify")
            clarify
            ;;
        "constitution")
            constitution
            ;;
        "implement")
            implement "$2"
            ;;
        "plan")
            plan "$2"
            ;;
        "specify")
            specify "$2"
            ;;
        "tasks")
            tasks "$2"
            ;;
        "setup")
            setup
            ;;
        "load")
            load
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

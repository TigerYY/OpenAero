#!/bin/bash

# Spec-Kit 命令别名
# 将此文件添加到您的 shell 配置文件中，或者直接 source 使用

# 基本命令
alias speckit='specify'
alias speckit-check='specify check'
alias speckit-help='specify --help'
alias speckit-init='specify init'

# 项目相关命令
alias speckit-list='ls -la specs/'
alias speckit-status='./scripts/spec-kit.sh status'
alias speckit-create='./scripts/spec-kit.sh create'

# 快速创建功能规范
speckit_new() {
    if [ -z "$1" ]; then
        echo "用法: speckit_new <功能名称>"
        echo "示例: speckit_new user-management"
        return 1
    fi
    ./scripts/spec-kit.sh create "$1"
}

# 快速查看规范
speckit_view() {
    if [ -z "$1" ]; then
        echo "用法: speckit_view <功能名称>"
        echo "示例: speckit_view user-authentication"
        return 1
    fi
    if [ -d "specs/$1" ]; then
        echo "=== 功能规范 ==="
        if [ -f "specs/$1/spec.md" ]; then
            echo "📄 spec.md"
        fi
        if [ -f "specs/$1/plan.md" ]; then
            echo "📄 plan.md"
        fi
        if [ -f "specs/$1/tasks.md" ]; then
            echo "📄 tasks.md"
        fi
        echo ""
        echo "编辑文件:"
        echo "  code specs/$1/spec.md"
        echo "  code specs/$1/plan.md"
        echo "  code specs/$1/tasks.md"
    else
        echo "错误: 功能规范 '$1' 不存在"
        echo "可用规范:"
        ls -1 specs/ 2>/dev/null || echo "  无"
    fi
}

# 显示帮助
speckit_help_full() {
    echo "🔧 Spec-Kit 命令帮助"
    echo ""
    echo "基本命令:"
    echo "  speckit-check         检查 Spec-Kit 状态"
    echo "  speckit-help          显示 specify 帮助"
    echo "  speckit-init          初始化项目"
    echo ""
    echo "项目管理:"
    echo "  speckit-list          列出所有规范"
    echo "  speckit-status        显示项目状态"
    echo "  speckit-create <名称> 创建新功能规范"
    echo "  speckit_new <名称>    创建新功能规范（函数）"
    echo "  speckit_view <名称>   查看功能规范文件"
    echo ""
    echo "示例:"
    echo "  speckit_new user-management"
    echo "  speckit_view user-authentication"
    echo "  speckit-status"
}

echo "✅ Spec-Kit 别名已加载！"
echo "输入 'speckit_help_full' 查看所有可用命令"
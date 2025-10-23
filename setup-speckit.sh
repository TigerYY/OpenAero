#!/bin/bash

# Spec-Kit 设置脚本
# 此脚本将设置 Spec-Kit 命令别名

echo "🔧 设置 Spec-Kit 命令别名..."

# 检测 shell 类型
if [ -n "$ZSH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
    SHELL_NAME="zsh"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.bashrc"
    SHELL_NAME="bash"
else
    echo "❌ 未识别的 shell 类型"
    exit 1
fi

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 检查是否已经添加了别名
if grep -q "Spec-Kit aliases" "$SHELL_CONFIG" 2>/dev/null; then
    echo "✅ Spec-Kit 别名已存在于 $SHELL_CONFIG"
else
    echo "📝 添加 Spec-Kit 别名到 $SHELL_CONFIG"
    
    # 添加别名到 shell 配置文件
    cat >> "$SHELL_CONFIG" << EOF

# Spec-Kit aliases - 自动生成于 $(date)
if [ -f "$PROJECT_ROOT/.specify-aliases.sh" ]; then
    source "$PROJECT_ROOT/.specify-aliases.sh"
fi
EOF
    
    echo "✅ 别名已添加到 $SHELL_CONFIG"
fi

echo ""
echo "🎉 设置完成！"
echo ""
echo "重新加载 shell 配置:"
echo "  source $SHELL_CONFIG"
echo ""
echo "或者重新打开终端，然后您就可以使用以下命令:"
echo "  speckit-check"
echo "  speckit-list"
echo "  speckit-new <功能名称>"
echo "  speckit-view <功能名称>"
echo "  speckit-help-full"

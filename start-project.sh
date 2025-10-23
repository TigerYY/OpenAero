#!/bin/bash

# OpenAero 项目专用启动脚本
# 确保始终在正确的项目目录下启动

set -e

# 获取脚本所在目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

echo "🚀 OpenAero 项目启动脚本"
echo "📁 项目目录: $PROJECT_ROOT"

# 强制切换到项目目录
cd "$PROJECT_ROOT"

# 验证在正确目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 未找到 package.json，请确保在正确的项目目录下运行"
    exit 1
fi

echo "✅ 项目目录验证通过: $(pwd)"

# 启动新的Shell会话，确保工作目录正确
exec zsh -c "
    echo '🔧 设置项目环境...'
    cd '$PROJECT_ROOT'
    echo '📁 当前工作目录: \$(pwd)'
    echo '💡 现在可以安全运行: npm run dev'
    echo '💡 或者运行: node scripts/start-dev.js'
    echo ''
    echo '🎯 可用的命令:'
    echo '  npm run dev          - 启动开发服务器'
    echo '  npm run dev:3000     - 在3000端口启动'
    echo '  npm run build        - 构建项目'
    echo '  npm run test         - 运行测试'
    echo ''
    echo '🔧 环境检查:'
    echo '  ./scripts/check-environment.sh'
    echo ''
    echo '📋 项目状态:'
    echo '  工作目录: \$(pwd)'
    echo '  Node版本: \$(node -v)'
    echo '  npm版本: \$(npm -v)'
    echo ''
    echo '✨ 项目环境已就绪！'
    zsh
"

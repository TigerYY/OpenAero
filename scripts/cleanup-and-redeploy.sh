#!/bin/bash

# 清理服务器环境并重新部署
# 使用方法: ./scripts/cleanup-and-redeploy.sh

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
SERVER="root@openaero.cn"
BLUE_DIR="/opt/openaero-web-blue"
GREEN_DIR="/opt/openaero-web-green"
CURRENT_LINK="/opt/openaero-web"
PM2_APP_NAME="openaero-web"
PM2_PORT=3000

echo -e "${GREEN}🧹 开始清理服务器环境并重新部署${NC}"
echo "====================================="

# 1. 停止所有 PM2 应用
echo -e "\n${YELLOW}📋 步骤 1: 停止所有 PM2 应用${NC}"
ssh $SERVER << EOF
    set -e
    echo "停止 PM2 应用..."
    pm2 stop all || true
    pm2 delete all || true
    echo "✅ PM2 应用已停止"
EOF

# 2. 清理旧的部署目录
echo -e "\n${YELLOW}🧹 步骤 2: 清理旧的部署目录${NC}"
ssh $SERVER << EOF
    set -e
    echo "清理 Blue 环境..."
    if [ -d "$BLUE_DIR" ]; then
        rm -rf $BLUE_DIR
        echo "✅ Blue 目录已删除"
    else
        echo "ℹ️  Blue 目录不存在，跳过"
    fi
    
    echo "清理 Green 环境..."
    if [ -d "$GREEN_DIR" ]; then
        rm -rf $GREEN_DIR
        echo "✅ Green 目录已删除"
    else
        echo "ℹ️  Green 目录不存在，跳过"
    fi
    
    echo "清理符号链接..."
    if [ -L "$CURRENT_LINK" ]; then
        rm -f $CURRENT_LINK
        echo "✅ 符号链接已删除"
    else
        echo "ℹ️  符号链接不存在，跳过"
    fi
    
    # 创建新的目录结构
    echo "创建新的目录结构..."
    mkdir -p $BLUE_DIR
    mkdir -p $GREEN_DIR
    echo "✅ 目录结构已创建"
EOF

# 3. 清理 Docker 资源（如果存在）
echo -e "\n${YELLOW}🐳 步骤 3: 清理 Docker 资源${NC}"
ssh $SERVER << EOF
    set -e
    echo "检查 Docker 资源..."
    
    # 停止所有容器
    if command -v docker &> /dev/null; then
        echo "停止 Docker 容器..."
        docker ps -aq | xargs -r docker stop 2>/dev/null || true
        docker ps -aq | xargs -r docker rm 2>/dev/null || true
        
        # 清理未使用的镜像
        echo "清理 Docker 镜像..."
        docker image prune -a -f 2>/dev/null || true
        
        # 清理未使用的卷
        echo "清理 Docker 卷..."
        docker volume prune -f 2>/dev/null || true
        
        # 清理构建缓存
        echo "清理 Docker 构建缓存..."
        docker builder prune -a -f 2>/dev/null || true
        
        echo "✅ Docker 资源清理完成"
    else
        echo "ℹ️  Docker 未安装，跳过"
    fi
EOF

# 4. 清理临时文件和缓存
echo -e "\n${YELLOW}🧹 步骤 4: 清理临时文件和缓存${NC}"
ssh $SERVER << EOF
    set -e
    echo "清理临时文件..."
    find /tmp -name "openaero-*" -type d -mtime +1 -exec rm -rf {} + 2>/dev/null || true
    find /tmp -name "*openaero*" -type f -mtime +1 -delete 2>/dev/null || true
    
    echo "清理 npm 缓存..."
    if command -v npm &> /dev/null; then
        npm cache clean --force 2>/dev/null || true
    fi
    
    echo "✅ 临时文件清理完成"
EOF

# 5. 显示清理后的磁盘空间
echo -e "\n${YELLOW}💾 步骤 5: 检查磁盘空间${NC}"
ssh $SERVER << EOF
    echo "磁盘使用情况:"
    df -h / | tail -1
    echo ""
    echo "可用空间:"
    df -h / | tail -1 | awk '{print \$4}'
EOF

echo -e "\n${GREEN}✅ 服务器清理完成！${NC}"
echo "====================================="
echo ""
echo -e "${YELLOW}🚀 开始重新部署...${NC}"
echo ""

# 6. 执行蓝绿部署
echo -e "${GREEN}执行蓝绿部署脚本...${NC}"
bash scripts/deploy-blue-green-directory.sh

echo -e "\n${GREEN}🎉 清理和重新部署完成！${NC}"


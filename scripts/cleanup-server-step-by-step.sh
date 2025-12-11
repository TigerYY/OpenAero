#!/bin/bash

# 分步清理服务器环境
# 使用方法: ./scripts/cleanup-server-step-by-step.sh

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

echo -e "${GREEN}🧹 开始分步清理服务器环境${NC}"
echo "====================================="

# 步骤 1: 停止 PM2
echo -e "\n${YELLOW}📋 步骤 1: 停止 PM2 应用${NC}"
ssh $SERVER << EOF
    set -e
    echo "停止并删除 PM2 应用..."
    pm2 stop $PM2_APP_NAME || true
    pm2 delete $PM2_APP_NAME || true
    pm2 save || true
    echo "✅ PM2 应用已停止"
EOF

# 步骤 2: 清理部署目录
echo -e "\n${YELLOW}🧹 步骤 2: 清理部署目录${NC}"
ssh $SERVER << EOF
    set -e
    echo "删除 Blue 目录..."
    rm -rf $BLUE_DIR || true
    echo "删除 Green 目录..."
    rm -rf $GREEN_DIR || true
    echo "删除符号链接..."
    rm -f $CURRENT_LINK || true
    echo "✅ 部署目录已清理"
    
    # 重新创建目录
    mkdir -p $BLUE_DIR
    mkdir -p $GREEN_DIR
    echo "✅ 新目录已创建"
EOF

# 步骤 3: 清理临时文件
echo -e "\n${YELLOW}🧹 步骤 3: 清理临时文件${NC}"
ssh $SERVER << EOF
    set -e
    echo "清理 npm 缓存..."
    npm cache clean --force 2>/dev/null || true
    echo "清理临时文件..."
    find /tmp -name "*openaero*" -type f -mtime +1 -delete 2>/dev/null || true
    echo "✅ 临时文件已清理"
EOF

# 步骤 4: 显示磁盘空间
echo -e "\n${YELLOW}💾 步骤 4: 检查磁盘空间${NC}"
ssh $SERVER "df -h / | tail -1"

echo -e "\n${GREEN}✅ 服务器清理完成！${NC}"
echo "现在可以执行部署脚本: ./scripts/deploy-blue-green-directory.sh"


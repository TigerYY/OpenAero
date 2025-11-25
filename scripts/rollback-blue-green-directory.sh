#!/bin/bash

# 基于目录的蓝绿部署回退脚本
# 使用方法: ./scripts/rollback-blue-green-directory.sh

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

echo -e "${YELLOW}🔄 开始回退部署${NC}"
echo "====================================="

# 1. 确定当前活动环境
echo -e "\n${YELLOW}📋 步骤 1: 检测当前活动环境${NC}"
CURRENT_ENV=$(ssh $SERVER "readlink -f $CURRENT_LINK | grep -o 'blue\|green' || echo 'blue'")
if [ "$CURRENT_ENV" = "blue" ]; then
    ROLLBACK_DIR=$GREEN_DIR
    ROLLBACK_ENV="green"
else
    ROLLBACK_DIR=$BLUE_DIR
    ROLLBACK_ENV="blue"
fi

echo "当前环境: $CURRENT_ENV"
echo "回退到: $ROLLBACK_ENV"

# 2. 检查回退环境是否存在
echo -e "\n${YELLOW}🔍 步骤 2: 检查回退环境${NC}"
if ssh $SERVER "[ ! -d $ROLLBACK_DIR ]"; then
    echo -e "${RED}❌ 回退环境 ($ROLLBACK_ENV) 不存在${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 回退环境存在${NC}"

# 3. 切换符号链接
echo -e "\n${YELLOW}🔄 步骤 3: 切换环境${NC}"
ssh $SERVER << EOF
    set -e
    
    # 停止当前应用
    echo "停止当前 PM2 应用..."
    pm2 stop $PM2_APP_NAME || true
    
    # 切换符号链接
    echo "切换符号链接到 $ROLLBACK_ENV..."
    ln -sfn $ROLLBACK_DIR $CURRENT_LINK
    
    # 验证切换
    LINK_TARGET=\$(readlink -f $CURRENT_LINK)
    if [ "\$LINK_TARGET" = "$ROLLBACK_DIR" ]; then
        echo "✅ 符号链接切换成功"
    else
        echo "❌ 符号链接切换失败"
        exit 1
    fi
EOF

# 4. 重启 PM2
echo -e "\n${YELLOW}🔄 步骤 4: 重启应用${NC}"
ssh $SERVER << EOF
    set -e
    cd $CURRENT_LINK
    
    # 重启 PM2 应用
    echo "重启 PM2 应用..."
    pm2 restart $PM2_APP_NAME || pm2 start npm --name $PM2_APP_NAME -- start
    
    # 等待应用启动
    sleep 5
    
    # 检查状态
    if pm2 list | grep -q "$PM2_APP_NAME.*online"; then
        echo "✅ 应用启动成功"
    else
        echo "❌ 应用启动失败"
        pm2 logs $PM2_APP_NAME --lines 50
        exit 1
    fi
EOF

# 5. 健康检查
echo -e "\n${YELLOW}🏥 步骤 5: 健康检查${NC}"
sleep 3

if ssh $SERVER "curl -f http://localhost:3000 > /dev/null 2>&1"; then
    echo -e "${GREEN}✅ 应用运行正常${NC}"
else
    echo -e "${RED}⚠️  警告: 应用可能未完全启动，请检查日志${NC}"
    ssh $SERVER "pm2 logs $PM2_APP_NAME --lines 20"
fi

# 6. 显示状态
echo -e "\n${GREEN}📊 回退完成！${NC}"
echo "====================================="
echo "当前活动环境: $ROLLBACK_ENV"
echo "应用目录: $ROLLBACK_DIR"
echo ""
echo "PM2 状态:"
ssh $SERVER "pm2 list | grep $PM2_APP_NAME"
echo ""
echo "查看日志: ssh $SERVER 'pm2 logs $PM2_APP_NAME'"


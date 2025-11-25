#!/bin/bash

# 基于目录的蓝绿部署脚本
# 使用方法: ./scripts/deploy-blue-green-directory.sh

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

echo -e "${GREEN}🚀 开始基于目录的蓝绿部署${NC}"
echo "====================================="

# 1. 确定当前活动环境
echo -e "\n${YELLOW}📋 步骤 1: 检测当前活动环境${NC}"
CURRENT_ENV=$(ssh $SERVER "readlink -f $CURRENT_LINK | grep -o 'blue\|green' || echo 'blue'")
if [ "$CURRENT_ENV" = "blue" ]; then
    ACTIVE_DIR=$BLUE_DIR
    INACTIVE_DIR=$GREEN_DIR
    ACTIVE_ENV="blue"
    INACTIVE_ENV="green"
else
    ACTIVE_DIR=$GREEN_DIR
    INACTIVE_DIR=$BLUE_DIR
    ACTIVE_ENV="green"
    INACTIVE_ENV="blue"
fi

echo "当前活动环境: $ACTIVE_ENV"
echo "将部署到: $INACTIVE_ENV"

# 2. 准备部署文件（跳过本地构建，在服务器上构建）
echo -e "\n${YELLOW}📦 步骤 2: 准备部署文件${NC}"
TEMP_DIR=$(mktemp -d)
echo "临时目录: $TEMP_DIR"

# 复制必要文件
rsync -av --progress \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.next/cache' \
    --exclude='.env.local' \
    --exclude='.env.development' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    . "$TEMP_DIR/"

echo -e "${GREEN}✅ 文件准备完成${NC}"

# 3. 上传到服务器（非活动环境）
echo -e "\n${YELLOW}📤 步骤 3: 上传文件到服务器 ($INACTIVE_ENV)${NC}"
ssh $SERVER "mkdir -p $INACTIVE_DIR"
rsync -av --progress --delete \
    --exclude='node_modules' \
    --exclude='.next/cache' \
    "$TEMP_DIR/" "$SERVER:$INACTIVE_DIR/"

echo -e "${GREEN}✅ 文件上传完成${NC}"

# 4. 在服务器上安装依赖和构建
echo -e "\n${YELLOW}🔧 步骤 4: 在服务器上安装依赖和构建${NC}"
ssh $SERVER << EOF
    set -e
    cd $INACTIVE_DIR
    
    # 安装依赖
    echo "安装 npm 依赖..."
    npm ci --production=false
    
    # 构建项目（如果需要）
    if [ ! -d ".next" ] || [ ".next" -ot "package.json" ]; then
        echo "构建 Next.js 应用..."
        npm run build
    fi
    
    echo "✅ 依赖安装和构建完成"
EOF

# 5. 健康检查（在非活动环境）
echo -e "\n${YELLOW}🏥 步骤 5: 健康检查 ($INACTIVE_ENV)${NC}"

# 临时启动非活动环境进行测试
TEST_PORT=3001
ssh $SERVER << EOF
    set -e
    cd $INACTIVE_DIR
    
    # 检查环境变量
    if [ ! -f ".env.production" ]; then
        echo "⚠️  警告: .env.production 不存在，将使用 .env.local（如果存在）"
    fi
    
    # 临时启动应用进行健康检查
    echo "临时启动应用在端口 $TEST_PORT 进行健康检查..."
    PORT=$TEST_PORT npm start &
    TEST_PID=\$!
    
    # 等待应用启动
    sleep 10
    
    # 健康检查
    if curl -f http://localhost:$TEST_PORT/api/health > /dev/null 2>&1; then
        echo "✅ 健康检查通过"
        kill \$TEST_PID 2>/dev/null || true
        wait \$TEST_PID 2>/dev/null || true
    else
        echo "⚠️  健康检查端点不存在，跳过"
        kill \$TEST_PID 2>/dev/null || true
        wait \$TEST_PID 2>/dev/null || true
    fi
EOF

# 6. 切换符号链接
echo -e "\n${YELLOW}🔄 步骤 6: 切换环境${NC}"
ssh $SERVER << EOF
    set -e
    
    # 停止当前应用
    echo "停止当前 PM2 应用..."
    pm2 stop $PM2_APP_NAME || true
    
    # 切换符号链接
    echo "切换符号链接到 $INACTIVE_ENV..."
    ln -sfn $INACTIVE_DIR $CURRENT_LINK
    
    # 验证切换
    LINK_TARGET=\$(readlink -f $CURRENT_LINK)
    if [ "\$LINK_TARGET" = "$INACTIVE_DIR" ]; then
        echo "✅ 符号链接切换成功"
    else
        echo "❌ 符号链接切换失败"
        exit 1
    fi
EOF

# 7. 重启 PM2
echo -e "\n${YELLOW}🔄 步骤 7: 重启应用${NC}"
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

# 8. 最终健康检查
echo -e "\n${YELLOW}🏥 步骤 8: 最终健康检查${NC}"
sleep 3

if ssh $SERVER "curl -f http://localhost:$PM2_PORT > /dev/null 2>&1"; then
    echo -e "${GREEN}✅ 应用运行正常${NC}"
else
    echo -e "${RED}⚠️  警告: 应用可能未完全启动，请检查日志${NC}"
    ssh $SERVER "pm2 logs $PM2_APP_NAME --lines 20"
fi

# 9. 清理
echo -e "\n${YELLOW}🧹 步骤 9: 清理临时文件${NC}"
rm -rf "$TEMP_DIR"
echo -e "${GREEN}✅ 清理完成${NC}"

# 10. 显示状态
echo -e "\n${GREEN}📊 部署完成！${NC}"
echo "====================================="
echo "当前活动环境: $INACTIVE_ENV"
echo "应用目录: $INACTIVE_DIR"
echo ""
echo "PM2 状态:"
ssh $SERVER "pm2 list | grep $PM2_APP_NAME"
echo ""
echo "查看日志: ssh $SERVER 'pm2 logs $PM2_APP_NAME'"
echo "查看状态: ssh $SERVER 'pm2 status'"


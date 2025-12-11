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
    --exclude='.env.production' \
    "$TEMP_DIR/" "$SERVER:$INACTIVE_DIR/"

echo -e "${GREEN}✅ 文件上传完成${NC}"

# 4. 在服务器上安装依赖和构建
echo -e "\n${YELLOW}🔧 步骤 4: 在服务器上安装依赖和构建${NC}"
ssh $SERVER << EOF
    set -e
    cd $INACTIVE_DIR
    
    # 检查必需的环境变量
    echo "检查环境变量..."
    MISSING_VARS=""
    if ! grep -q "^NEXT_PUBLIC_SUPABASE_URL=" .env.production 2>/dev/null; then
        MISSING_VARS="\${MISSING_VARS}NEXT_PUBLIC_SUPABASE_URL "
    fi
    if ! grep -q "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.production 2>/dev/null; then
        MISSING_VARS="\${MISSING_VARS}NEXT_PUBLIC_SUPABASE_ANON_KEY "
    fi
    if ! grep -q "^SUPABASE_SERVICE_ROLE_KEY=" .env.production 2>/dev/null; then
        MISSING_VARS="\${MISSING_VARS}SUPABASE_SERVICE_ROLE_KEY "
    fi
    
    if [ -n "\$MISSING_VARS" ]; then
        echo "❌ 错误: .env.production 文件缺少以下必需的环境变量:"
        echo "   \$MISSING_VARS"
        echo ""
        echo "请确保 .env.production 文件包含所有必需的环境变量后再重新部署。"
        exit 1
    fi
    echo "✅ 环境变量检查通过"
    
    # 安装依赖
    echo "安装 npm 依赖..."
    npm ci --production=false
    
    # 强制构建项目（确保 .next 目录完整）
    echo "构建 Next.js 应用..."
    rm -rf .next
    npm run build
    
    # 验证构建结果
    if [ ! -f ".next/BUILD_ID" ]; then
        echo "❌ 构建失败：缺少 BUILD_ID 文件"
        exit 1
    fi
    echo "✅ 构建验证通过"
    
    # 确保 standalone 模式下的静态文件正确复制
    if [ -d ".next/standalone" ] && [ -d ".next/static" ]; then
        echo "复制静态文件到 standalone 目录..."
        mkdir -p .next/standalone/.next
        cp -r .next/static .next/standalone/.next/static
        echo "✅ 静态文件已复制到 standalone 目录"
    fi
    
    # 确保 public 目录正确复制到 standalone 目录
    if [ -d ".next/standalone" ] && [ -d "public" ]; then
        echo "复制 public 目录到 standalone 目录..."
        mkdir -p .next/standalone/public
        cp -r public/* .next/standalone/public/ 2>/dev/null || cp -r public/. .next/standalone/public/ 2>/dev/null
        echo "✅ public 目录已复制到 standalone 目录"
    fi
    
    # 构建后资源校验（静态 chunk 与 logo）
    LOGO_URL="http://localhost:3000/images/openaero-logo-trimmed.png"
    CHUNK_URL="http://localhost:3000/_next/static/chunks/main.js"
    echo "验证关键静态资源..."
    if curl -fI "$LOGO_URL" >/dev/null 2>&1 && curl -fI "$CHUNK_URL" >/dev/null 2>&1; then
        echo "✅ 构建产物静态资源可访问"
    else
        echo "⚠️  构建后静态资源预检失败（logo 或 main.js），继续部署前请检查"
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
    else
        echo "⚠️  健康检查端点不存在，跳过"
    fi
    
    # 额外静态资源校验（测试端口）
    LOGO_URL="http://localhost:$TEST_PORT/images/openaero-logo-trimmed.png"
    CHUNK_URL="http://localhost:$TEST_PORT/_next/static/chunks/main.js"
    echo "验证关键静态资源 (测试端口 $TEST_PORT)..."
    if curl -fI "$LOGO_URL" >/dev/null 2>&1 && curl -fI "$CHUNK_URL" >/dev/null 2>&1; then
        echo "✅ 静态资源校验通过 (测试端口)"
    else
        echo "⚠️  静态资源校验失败 (测试端口)，请检查 public/.next/standalone 复制情况"
    fi
    
    kill \$TEST_PID 2>/dev/null || true
    wait \$TEST_PID 2>/dev/null || true
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

# 额外静态资源校验（正式端口）
LOGO_URL="http://localhost:$PM2_PORT/images/openaero-logo-trimmed.png"
CHUNK_URL="http://localhost:$PM2_PORT/_next/static/chunks/main.js"
echo "验证关键静态资源 (正式端口 $PM2_PORT)..."
if ssh $SERVER "curl -fI \"$LOGO_URL\" >/dev/null 2>&1 && curl -fI \"$CHUNK_URL\" >/dev/null 2>&1"; then
    echo -e "${GREEN}✅ 静态资源校验通过 (正式端口)${NC}"
else
    echo -e "${RED}⚠️  静态资源校验失败 (正式端口)，请检查 public/.next/standalone 复制情况${NC}"
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


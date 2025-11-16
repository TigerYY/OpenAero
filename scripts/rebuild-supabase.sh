#!/bin/bash
set -e

echo "🔧 OpenAero Supabase 数据库重建脚本"
echo "========================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 读取环境变量
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# 确认操作
echo -e "${RED}⚠️  警告: 此操作将删除数据库中的所有数据!${NC}"
echo ""
read -p "确认要继续吗? (输入 'YES' 继续): " confirmation

if [ "$confirmation" != "YES" ]; then
  echo "操作已取消"
  exit 1
fi

echo ""
echo "🚀 开始重建过程..."
echo ""

# Step 1: 清理现有数据
echo "📦 Step 1/7: 清理现有数据..."
psql "$DIRECT_URL" -f scripts/rebuild-database.sql || {
  echo -e "${YELLOW}⚠️  清理可能有警告,继续...${NC}"
}
echo -e "${GREEN}✓${NC} 清理完成"
echo ""

# Step 2: 应用新schema
echo "🗄️  Step 2/7: 应用新数据库结构..."
DATABASE_URL="$DATABASE_URL" DIRECT_URL="$DIRECT_URL" npx prisma db push --accept-data-loss --skip-generate
echo -e "${GREEN}✓${NC} Schema应用完成"
echo ""

# Step 3: 生成Prisma Client
echo "⚙️  Step 3/7: 生成Prisma Client..."
npx prisma generate
echo -e "${GREEN}✓${NC} Client生成完成"
echo ""

# Step 4: 配置RLS策略
echo "🔒 Step 4/7: 配置Row Level Security..."
psql "$DIRECT_URL" -f scripts/setup-rls.sql
echo -e "${GREEN}✓${NC} RLS配置完成"
echo ""

# Step 5: 验证数据库结构
echo "🔍 Step 5/7: 验证数据库结构..."
npx prisma validate
echo -e "${GREEN}✓${NC} 验证通过"
echo ""

# Step 6: 创建测试数据
echo "📝 Step 6/7: 创建测试数据..."
echo "需要手动在Supabase控制台创建测试用户"
echo -e "${YELLOW}⚠️  跳过自动创建测试数据${NC}"
echo ""

# Step 7: 重启开发服务器
echo "🔄 Step 7/7: 准备重启开发服务器..."
echo ""

echo "========================================"
echo -e "${GREEN}✅ 数据库重建完成!${NC}"
echo ""
echo "下一步:"
echo "1. 在Supabase控制台创建测试用户"
echo "2. 运行 'npm run dev' 启动开发服务器"
echo "3. 测试用户注册和登录功能"
echo ""

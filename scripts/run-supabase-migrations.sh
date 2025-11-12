#!/bin/bash

# ============================================
# Supabase 数据库迁移执行脚本
# ============================================

set -e  # 遇到错误立即退出

echo "🚀 OpenAero Supabase 数据库迁移"
echo "================================"
echo ""

# 检查环境变量
if [ -z "$DATABASE_URL" ]; then
  echo "❌ 错误: DATABASE_URL 环境变量未设置"
  echo "请在 .env.local 中配置数据库连接字符串"
  exit 1
fi

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠️  警告: 此脚本将修改数据库结构${NC}"
echo "此操作将:"
echo "  1. 创建 user_profiles 表"
echo "  2. 更新 creator_profiles 表"
echo "  3. 更新其他相关表的外键关联"
echo "  4. 添加 RLS 策略"
echo ""
read -p "是否继续? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ 已取消"
    exit 1
fi

echo ""
echo "📋 开始执行迁移..."
echo ""

# 迁移文件目录
MIGRATION_DIR="./supabase/migrations"

# 检查迁移文件是否存在
if [ ! -d "$MIGRATION_DIR" ]; then
  echo "❌ 错误: 迁移目录不存在: $MIGRATION_DIR"
  exit 1
fi

# 执行迁移 (使用 psql)
# 注意: 需要安装 PostgreSQL 客户端工具

echo "1️⃣  执行迁移 001: 创建 user_profiles 表..."
psql "$DATABASE_URL" -f "$MIGRATION_DIR/001_create_user_profiles.sql"
echo -e "${GREEN}✓ 完成${NC}"
echo ""

echo "2️⃣  执行迁移 002: 更新 creator_profiles 表..."
psql "$DATABASE_URL" -f "$MIGRATION_DIR/002_update_creator_profiles.sql"
echo -e "${GREEN}✓ 完成${NC}"
echo ""

echo "3️⃣  执行迁移 003: 更新其他相关表..."
psql "$DATABASE_URL" -f "$MIGRATION_DIR/003_update_other_tables.sql"
echo -e "${GREEN}✓ 完成${NC}"
echo ""

echo -e "${GREEN}✅ 所有迁移执行完成!${NC}"
echo ""
echo "📝 后续步骤:"
echo "  1. 运行 Prisma 生成客户端: npx prisma generate"
echo "  2. 验证数据库结构: npx prisma db pull"
echo "  3. 运行测试以确保一切正常"
echo ""
echo "🎉 数据库迁移成功完成!"

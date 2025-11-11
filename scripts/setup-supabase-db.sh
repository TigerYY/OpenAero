#!/bin/bash

# ============================================
# Supabase 数据库设置脚本
# ============================================

set -e

echo "🚀 开始设置 Supabase 数据库..."

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查环境变量
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo -e "${RED}❌ 错误: NEXT_PUBLIC_SUPABASE_URL 环境变量未设置${NC}"
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo -e "${RED}❌ 错误: SUPABASE_SERVICE_ROLE_KEY 环境变量未设置${NC}"
  exit 1
fi

echo -e "${YELLOW}📋 环境变量已加载${NC}"
echo "   Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"

# 读取 SQL 文件
SQL_FILE="supabase/migrations/001_create_user_tables.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo -e "${RED}❌ 错误: SQL 文件不存在: $SQL_FILE${NC}"
  exit 1
fi

echo -e "${YELLOW}📄 读取 SQL 文件: $SQL_FILE${NC}"

# 执行 SQL 迁移
echo -e "${YELLOW}🔨 执行数据库迁移...${NC}"

# 使用 psql 执行 SQL (如果已安装)
if command -v psql &> /dev/null; then
  echo -e "${YELLOW}使用 psql 执行迁移...${NC}"
  
  # 提取项目 ID
  PROJECT_ID=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -n 's/.*\/\/\([^.]*\).*/\1/p')
  
  # 构建数据库连接字符串
  DB_URL="postgresql://postgres:${DATABASE_PASSWORD}@db.${PROJECT_ID}.supabase.co:5432/postgres"
  
  psql "$DB_URL" -f "$SQL_FILE"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 数据库迁移成功!${NC}"
  else
    echo -e "${RED}❌ 数据库迁移失败${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}⚠️  psql 未安装，请使用以下方法之一执行迁移:${NC}"
  echo ""
  echo "方法 1: 在 Supabase Dashboard 中执行"
  echo "  1. 访问 https://supabase.com/dashboard/project/$PROJECT_ID/sql"
  echo "  2. 创建新的 SQL 查询"
  echo "  3. 复制 $SQL_FILE 的内容并执行"
  echo ""
  echo "方法 2: 使用 Supabase CLI"
  echo "  1. 安装 Supabase CLI: npm install -g supabase"
  echo "  2. 登录: supabase login"
  echo "  3. 链接项目: supabase link --project-ref $PROJECT_ID"
  echo "  4. 执行迁移: supabase db push"
  echo ""
  echo "方法 3: 使用 Node.js 脚本"
  echo "  运行: node scripts/run-supabase-migration.js"
fi

echo -e "${GREEN}✨ 设置完成!${NC}"

#!/bin/bash

# Prisma Schema 同步脚本

echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║     🔄 Prisma Schema 同步工具 🔄                      ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# 加载环境变量
export $(cat .env.local | grep -v '^#' | xargs)

echo "✅ 环境变量已加载"
echo "   DATABASE_URL: ${DATABASE_URL:0:50}..."
echo ""

# 备份当前schema
echo "📦 备份当前 Prisma schema..."
cp prisma/schema.prisma prisma/schema.prisma.backup
echo "✅ 备份完成: prisma/schema.prisma.backup"
echo ""

# 从数据库拉取schema
echo "🔄 从数据库同步schema..."
npx prisma db pull --force

if [ $? -eq 0 ]; then
    echo "✅ Schema同步成功!"
    echo ""
    
    # 重新生成 Prisma Client
    echo "🔨 重新生成 Prisma Client..."
    npx prisma generate
    
    if [ $? -eq 0 ]; then
        echo "✅ Prisma Client 生成成功!"
        echo ""
        echo "╔═══════════════════════════════════════════════════════╗"
        echo "║             同步完成! ✅                              ║"
        echo "╚═══════════════════════════════════════════════════════╝"
        echo ""
        echo "📋 下一步:"
        echo "   1. 查看: cat prisma/schema.prisma"
        echo "   2. 检查字段映射是否正确"
        echo "   3. 运行验证: node scripts/check-supabase-integration.js"
        echo ""
    else
        echo "❌ Prisma Client 生成失败"
        exit 1
    fi
else
    echo "❌ Schema同步失败"
    echo ""
    echo "🔄 恢复备份..."
    mv prisma/schema.prisma.backup prisma/schema.prisma
    echo "✅ 已恢复原schema"
    exit 1
fi

#!/bin/bash

# ============================================
# 数据库优化脚本执行工具
# ============================================

set -e  # 遇到错误立即退出

echo "=================================="
echo "🚀 OpenAero 数据库优化工具"
echo "=================================="
echo ""

# 检查是否有.env.local文件
if [ ! -f .env.local ]; then
    echo "❌ 错误: .env.local 文件不存在"
    echo "请创建 .env.local 并配置 DATABASE_URL"
    exit 1
fi

# 加载环境变量
source .env.local

# 检查DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ 错误: DATABASE_URL 未设置"
    echo "请在 .env.local 中配置 DATABASE_URL"
    exit 1
fi

echo "✅ 环境变量已加载"
echo ""

# 菜单选择
echo "请选择要执行的优化："
echo "1) 完善RLS策略"
echo "2) 添加数据库索引"
echo "3) 创建优化查询函数"
echo "4) 执行全部优化"
echo "5) 仅刷新物化视图"
echo "0) 退出"
echo ""
read -p "请输入选项 (0-5): " choice

case $choice in
    1)
        echo ""
        echo "📋 执行: 完善RLS策略"
        echo "=================================="
        psql "$DATABASE_URL" < scripts/enhanced-rls-policies.sql
        echo ""
        echo "✅ RLS策略已更新"
        ;;
    2)
        echo ""
        echo "📊 执行: 添加数据库索引"
        echo "=================================="
        psql "$DATABASE_URL" < scripts/add-database-indexes.sql
        echo ""
        echo "✅ 数据库索引已创建"
        ;;
    3)
        echo ""
        echo "⚡ 执行: 创建优化查询函数"
        echo "=================================="
        psql "$DATABASE_URL" < scripts/optimized-queries.sql
        echo ""
        echo "✅ 优化查询函数已创建"
        ;;
    4)
        echo ""
        echo "🎯 执行: 全部优化"
        echo "=================================="
        
        echo ""
        echo "步骤 1/3: 完善RLS策略..."
        psql "$DATABASE_URL" < scripts/enhanced-rls-policies.sql
        echo "✅ RLS策略已更新"
        
        echo ""
        echo "步骤 2/3: 添加数据库索引..."
        psql "$DATABASE_URL" < scripts/add-database-indexes.sql
        echo "✅ 数据库索引已创建"
        
        echo ""
        echo "步骤 3/3: 创建优化查询函数..."
        psql "$DATABASE_URL" < scripts/optimized-queries.sql
        echo "✅ 优化查询函数已创建"
        
        echo ""
        echo "=================================="
        echo "🎉 所有优化已完成！"
        echo "=================================="
        ;;
    5)
        echo ""
        echo "🔄 执行: 刷新物化视图"
        echo "=================================="
        psql "$DATABASE_URL" -c "SELECT refresh_materialized_views();"
        echo ""
        echo "✅ 物化视图已刷新"
        ;;
    0)
        echo "退出"
        exit 0
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac

echo ""
echo "=================================="
echo "✅ 操作完成"
echo "=================================="
echo ""
echo "📝 建议："
echo "  - 查看执行日志确认无错误"
echo "  - 运行 npm run dev 测试API性能"
echo "  - 定期刷新物化视图以更新统计数据"
echo ""

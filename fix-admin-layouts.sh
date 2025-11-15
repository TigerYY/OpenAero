#!/bin/bash
# 系统性修复所有admin页面的Layout问题

cd /Users/yangyang/Documents/YYCode/OpenAero/openaero.web

echo "🔍 检查需要修复的admin页面..."

# 需要添加AdminLayout import的文件列表
FILES_TO_FIX=(
  "src/app/[locale]/admin/audit-logs/page.tsx"
  "src/app/[locale]/admin/permissions/page.tsx"
  "src/app/[locale]/admin/products/page.tsx"
  "src/app/[locale]/admin/review-stats/page.tsx"
  "src/app/[locale]/admin/review-workbench/page.tsx"
)

for file in "${FILES_TO_FIX[@]}"; do
  if [ -f "$file" ]; then
    echo "📝 处理: $file"
    
    # 检查是否已经有AdminLayout import
    if ! grep -q "AdminLayout" "$file"; then
      echo "  ➕ 添加AdminLayout import"
      # 在第一个import语句后添加AdminLayout import
      sed -i.bak '/^import.*from.*@\/components\/ui/a\
import { AdminLayout } from '"'"'@/components/layout/AdminLayout'"'"';
' "$file"
    fi
    
    # 查找并包装主return语句
    echo "  🔧 包装return语句..."
    # 这个比较复杂，需要手动处理
  fi
done

echo "✅ 批量处理完成"
echo "⚠️  请手动检查并包装每个文件的return语句为 <AdminLayout>...</AdminLayout>"

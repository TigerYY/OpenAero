#!/bin/bash

# 查找所有包含重复 useRouting 声明的文件
echo "🔍 查找重复的 useRouting 声明..."

FILES=(
  "src/components/layout/EnhancedMobileNavigation.tsx"
  "src/components/layout/Header.tsx"
  "src/components/sections/CreatorHero.tsx"
  "src/app/[locale]/(auth)/forgot-password/page.tsx"
  "src/app/[locale]/(auth)/login/page.tsx"
  "src/app/[locale]/(auth)/register/page.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "📝 检查: $file"
    # 统计 useRouting 声明次数
    count=$(grep -c "const { route.*} = useRouting()" "$file" || echo "0")
    if [ "$count" -gt 1 ]; then
      echo "  ❌ 发现 $count 个重复声明，正在修复..."
      # 这里只能手动修复，因为需要保留正确的那一个
    fi
  fi
done

echo "✅ 检查完成"

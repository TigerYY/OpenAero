#!/bin/bash

# 路由系统全面审计脚本
# 用法: bash scripts/audit-routing.sh

set -e

echo "🔍 开始路由系统全面审计..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 检查硬编码路由
echo "1️⃣ 检查硬编码路由..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

hardcoded=$(grep -rn 'href="/' src --include="*.tsx" --include="*.ts" 2>/dev/null | \
  grep -v 'route(' | \
  grep -v 'ROUTES' | \
  grep -v 'http' | \
  grep -v '/_next' | \
  grep -v '/api' | \
  grep -v '/images' | \
  grep -v 'mailto:' || true)

if [ -z "$hardcoded" ]; then
  echo -e "${GREEN}✅ 没有发现硬编码路由${NC}"
else
  hardcoded_count=$(echo "$hardcoded" | wc -l)
  echo -e "${YELLOW}⚠️  发现 $hardcoded_count 个潜在的硬编码路由:${NC}"
  echo "$hardcoded" | head -10
  if [ $hardcoded_count -gt 10 ]; then
    echo "... (还有 $((hardcoded_count - 10)) 个)"
  fi
fi
echo ""

# 2. 检查重复的 useRouting 声明
echo "2️⃣ 检查重复的 useRouting 声明..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

duplicate_files=$(find src -name "*.tsx" -type f -exec sh -c '
  count=$(grep -c "const { route" "$1" 2>/dev/null || echo "0")
  if [ "$count" -gt 1 ]; then
    echo "$1: $count"
  fi
' _ {} \;)

if [ -z "$duplicate_files" ]; then
  echo -e "${GREEN}✅ 没有发现重复声明${NC}"
else
  echo -e "${YELLOW}⚠️  发现重复声明:${NC}"
  echo "$duplicate_files"
fi
echo ""

# 3. 运行深度路由验证
echo "3️⃣ 运行深度路由验证..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "scripts/deep-route-validation.ts" ]; then
  npx tsx scripts/deep-route-validation.ts 2>&1 | tail -20
else
  echo -e "${YELLOW}⚠️  深度验证脚本不存在${NC}"
fi
echo ""

# 4. 检查翻译文件完整性
echo "4️⃣ 检查翻译文件..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "scripts/check-i18n-completeness.ts" ]; then
  npx tsx scripts/check-i18n-completeness.ts 2>&1 | tail -30
else
  # 简单检查
  for locale in zh-CN en-US zh en; do
    if [ -f "messages/${locale}.json" ]; then
      echo -e "${GREEN}✅ ${locale} 翻译文件存在${NC}"
    else
      echo -e "${RED}❌ ${locale} 翻译文件缺失${NC}"
    fi
  done
fi
echo ""

# 5. 检查路由覆盖率
echo "5️⃣ 检查路由覆盖率..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "scripts/route-coverage.ts" ]; then
  npx tsx scripts/route-coverage.ts 2>&1 | tail -30
else
  echo -e "${YELLOW}⚠️  路由覆盖率脚本不存在${NC}"
fi
echo ""

# 6. TypeScript 类型检查
echo "6️⃣ TypeScript 类型检查..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
  echo -e "${RED}❌ 发现 TypeScript 错误${NC}"
  npx tsc --noEmit 2>&1 | grep "error TS" | head -10
else
  echo -e "${GREEN}✅ TypeScript 类型检查通过${NC}"
fi
echo ""

# 7. ESLint 检查
echo "7️⃣ ESLint 检查..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if npm run lint 2>&1 | grep -q "error"; then
  echo -e "${YELLOW}⚠️  发现 ESLint 警告/错误${NC}"
  npm run lint 2>&1 | grep -E "(error|warning)" | head -10
else
  echo -e "${GREEN}✅ ESLint 检查通过${NC}"
fi
echo ""

# 8. 构建测试（可选，耗时较长）
if [ "$1" == "--build" ]; then
  echo "8️⃣ 构建测试..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  if npm run build; then
    echo -e "${GREEN}✅ 构建成功${NC}"
  else
    echo -e "${RED}❌ 构建失败${NC}"
    exit 1
  fi
  echo ""
fi

# 总结
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 审计完成总结"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "审计项目:"
echo "  1. 硬编码路由检查"
echo "  2. 重复声明检查"
echo "  3. 深度路由验证"
echo "  4. 翻译文件检查"
echo "  5. 路由覆盖率检查"
echo "  6. TypeScript 类型检查"
echo "  7. ESLint 检查"
if [ "$1" == "--build" ]; then
  echo "  8. 构建测试"
fi
echo ""
echo "💡 提示: 运行 'bash scripts/audit-routing.sh --build' 包含构建测试"
echo ""

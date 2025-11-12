#!/bin/bash
# 国际化与路由快速检查脚本
# 用于日常开发中快速验证国际化和路由配置

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 图标
CHECK="✅"
CROSS="❌"
WARNING="⚠️"
INFO="ℹ️"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🌍 国际化与路由快速检查${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 计数器
PASS=0
FAIL=0
WARN=0

# 1. 检查配置文件存在性
echo -e "${BLUE}📂 1. 检查配置文件...${NC}"
CONFIG_FILES=(
  "next.config.js"
  "middleware.ts"
  "src/i18n.ts"
  "src/config/app.ts"
  "src/lib/routing.ts"
  "messages/zh-CN.json"
  "messages/en-US.json"
)

for file in "${CONFIG_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "  ${GREEN}${CHECK}${NC} $file"
    ((PASS++))
  else
    echo -e "  ${RED}${CROSS}${NC} $file ${RED}(缺失)${NC}"
    ((FAIL++))
  fi
done
echo ""

# 2. 检查 Next.js 配置语法
echo -e "${BLUE}🔧 2. 检查 Next.js 配置...${NC}"
if node -c next.config.js 2>/dev/null; then
  echo -e "  ${GREEN}${CHECK}${NC} next.config.js 语法正确"
  ((PASS++))
else
  echo -e "  ${RED}${CROSS}${NC} next.config.js 语法错误"
  ((FAIL++))
fi
echo ""

# 3. 检查翻译文件 JSON 格式
echo -e "${BLUE}📝 3. 检查翻译文件格式...${NC}"
for locale in "zh-CN" "en-US"; do
  file="messages/${locale}.json"
  if [ -f "$file" ]; then
    if jq empty "$file" 2>/dev/null; then
      key_count=$(jq -r 'paths(scalars) | length' "$file" | wc -l | xargs)
      echo -e "  ${GREEN}${CHECK}${NC} $file (${key_count} keys)"
      ((PASS++))
    else
      echo -e "  ${RED}${CROSS}${NC} $file JSON 格式错误"
      ((FAIL++))
    fi
  fi
done
echo ""

# 4. 检查翻译完整性
echo -e "${BLUE}🌍 4. 检查翻译完整性...${NC}"
if command -v npx &> /dev/null; then
  COMPLETENESS=$(npx tsx scripts/check-i18n-completeness.ts 2>/dev/null | grep "平均完整度" | grep -o '[0-9.]*%' || echo "0%")
  COMPLETENESS_NUM=$(echo $COMPLETENESS | sed 's/%//')
  
  if (( $(echo "$COMPLETENESS_NUM > 90" | bc -l) )); then
    echo -e "  ${GREEN}${CHECK}${NC} 翻译完整度: ${COMPLETENESS} (优秀)"
    ((PASS++))
  elif (( $(echo "$COMPLETENESS_NUM > 70" | bc -l) )); then
    echo -e "  ${YELLOW}${WARNING}${NC} 翻译完整度: ${COMPLETENESS} (良好)"
    ((WARN++))
  else
    echo -e "  ${RED}${CROSS}${NC} 翻译完整度: ${COMPLETENESS} (需要改进)"
    ((FAIL++))
  fi
  
  # 检查缺失的 en-US 翻译
  MISSING_EN=$(npx tsx scripts/check-i18n-completeness.ts 2>/dev/null | grep "仅 zh-CN 有的 key" | grep -o '[0-9]*' | head -1 || echo "0")
  if [ "$MISSING_EN" -gt 0 ]; then
    echo -e "  ${YELLOW}${WARNING}${NC} 缺少 ${MISSING_EN} 个 en-US 翻译"
    echo -e "     ${INFO} 运行: npx tsx scripts/generate-translation-todos.ts"
  fi
else
  echo -e "  ${YELLOW}${WARNING}${NC} 跳过 (npx 不可用)"
  ((WARN++))
fi
echo ""

# 5. 检查路由定义
echo -e "${BLUE}🛣️  5. 检查路由定义...${NC}"
if grep -q "export const ROUTES" src/lib/routing.ts; then
  ROUTE_COUNT=$(grep -o "': '/" src/lib/routing.ts | wc -l | xargs)
  echo -e "  ${GREEN}${CHECK}${NC} ROUTES 常量已定义 (${ROUTE_COUNT} 个路由)"
  ((PASS++))
else
  echo -e "  ${RED}${CROSS}${NC} ROUTES 常量未找到"
  ((FAIL++))
fi

if grep -q "export function useRouting" src/lib/routing.ts; then
  echo -e "  ${GREEN}${CHECK}${NC} useRouting Hook 已定义"
  ((PASS++))
else
  echo -e "  ${RED}${CROSS}${NC} useRouting Hook 未找到"
  ((FAIL++))
fi
echo ""

# 6. 检查硬编码路由
echo -e "${BLUE}🔍 6. 检查硬编码路由...${NC}"
HARDCODED=$(grep -r "href=['\"]/" src --include="*.tsx" --include="*.ts" | \
  grep -v "href=['\"]/(api|_next|\$|\{|https://|mailto:|tel:)" | \
  wc -l | xargs)

if [ "$HARDCODED" -eq 0 ]; then
  echo -e "  ${GREEN}${CHECK}${NC} 未发现硬编码路由"
  ((PASS++))
else
  echo -e "  ${YELLOW}${WARNING}${NC} 发现 ${HARDCODED} 个可能的硬编码路由"
  echo -e "     ${INFO} 运行: npm run check:routes"
  ((WARN++))
fi
echo ""

# 7. 检查语言配置一致性
echo -e "${BLUE}⚙️  7. 检查语言配置一致性...${NC}"

# 检查 middleware.ts
MIDDLEWARE_LOCALES=$(grep "locales:" middleware.ts | grep -o "\['[^']*'[^]]*\]" || echo "[]")
echo -e "  ${INFO} middleware.ts: ${MIDDLEWARE_LOCALES}"

# 检查 app.ts
APP_LOCALES=$(grep "supportedLocales:" src/config/app.ts | grep -o "\['[^']*'[^]]*\]" || echo "[]")
echo -e "  ${INFO} app.ts: ${APP_LOCALES}"

if [ "$MIDDLEWARE_LOCALES" == "$APP_LOCALES" ]; then
  echo -e "  ${GREEN}${CHECK}${NC} 语言配置一致"
  ((PASS++))
else
  echo -e "  ${YELLOW}${WARNING}${NC} 语言配置可能不一致"
  echo -e "     ${INFO} 运行: npx tsx scripts/fix-i18n-config-consistency.ts"
  ((WARN++))
fi

# 检查 zh.json 和 en.json
if [ -f "messages/zh.json" ] || [ -f "messages/en.json" ]; then
  echo -e "  ${YELLOW}${WARNING}${NC} 发现额外的语言文件 (zh.json/en.json)"
  echo -e "     ${INFO} 确认用途或删除"
  ((WARN++))
fi
echo ""

# 8. 检查 TypeScript 配置
echo -e "${BLUE}📘 8. 检查 TypeScript 配置...${NC}"
if [ -f "tsconfig.json" ]; then
  if jq empty tsconfig.json 2>/dev/null; then
    echo -e "  ${GREEN}${CHECK}${NC} tsconfig.json 格式正确"
    ((PASS++))
    
    # 检查路径别名
    if jq '.compilerOptions.paths | has("@/*")' tsconfig.json | grep -q true; then
      echo -e "  ${GREEN}${CHECK}${NC} 路径别名已配置"
      ((PASS++))
    else
      echo -e "  ${YELLOW}${WARNING}${NC} 路径别名未配置"
      ((WARN++))
    fi
  else
    echo -e "  ${RED}${CROSS}${NC} tsconfig.json 格式错误"
    ((FAIL++))
  fi
fi
echo ""

# 9. 快速构建测试
echo -e "${BLUE}🏗️  9. 快速构建测试...${NC}"
echo -e "  ${INFO} 跳过 (耗时较长，手动运行: npm run build)"
echo ""

# 10. 总结
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 检查总结${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${GREEN}${CHECK} 通过:${NC} $PASS"
echo -e "  ${YELLOW}${WARNING} 警告:${NC} $WARN"
echo -e "  ${RED}${CROSS} 失败:${NC} $FAIL"
echo ""

TOTAL=$((PASS + WARN + FAIL))
if [ $TOTAL -gt 0 ]; then
  SCORE=$(echo "scale=1; ($PASS * 100) / $TOTAL" | bc)
  echo -e "  ${BLUE}健康度:${NC} ${SCORE}%"
  echo ""
fi

# 建议
if [ $FAIL -gt 0 ]; then
  echo -e "${RED}❌ 发现严重问题，建议立即修复${NC}"
  echo ""
  echo -e "下一步:"
  echo -e "  1. 查看详细报告: cat I18N_ROUTING_COMPREHENSIVE_AUDIT.md"
  echo -e "  2. 查看修复指南: cat I18N_ROUTING_FIX_GUIDE.md"
  echo ""
  exit 1
elif [ $WARN -gt 0 ]; then
  echo -e "${YELLOW}⚠️  发现警告，建议检查${NC}"
  echo ""
  echo -e "下一步:"
  echo -e "  1. 补充翻译: npx tsx scripts/generate-translation-todos.ts"
  echo -e "  2. 统一配置: npx tsx scripts/fix-i18n-config-consistency.ts"
  echo ""
  exit 0
else
  echo -e "${GREEN}✅ 所有检查通过！${NC}"
  echo ""
  exit 0
fi

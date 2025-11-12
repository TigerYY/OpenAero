#!/bin/bash

###############################################################################
# PR 路由检查脚本
# 
# 用途: 在 PR/CI 中自动检查路由问题
# 使用: ./scripts/check-routes-ci.sh
# 
# 退出代码:
#   0 - 检查通过,无路由问题
#   1 - 发现路由问题
#   2 - 脚本执行错误
###############################################################################

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔍 PR 路由规范检查${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 步骤1: 运行路由诊断脚本
echo -e "${YELLOW}📋 步骤 1/3: 运行路由诊断脚本...${NC}"
echo ""

if ! npx tsx scripts/diagnose-routes.ts > /dev/null 2>&1; then
  echo -e "${RED}❌ 诊断脚本执行失败${NC}"
  exit 2
fi

# 检查是否生成了报告
if [ ! -f "route-diagnosis-report.json" ]; then
  echo -e "${RED}❌ 未找到诊断报告文件${NC}"
  exit 2
fi

# 步骤2: 解析诊断结果
echo -e "${YELLOW}📊 步骤 2/3: 分析诊断结果...${NC}"
echo ""

# 提取总问题数
TOTAL_ISSUES=$(cat route-diagnosis-report.json | jq '.summary.totalIssues // 0')
TOTAL_FILES=$(cat route-diagnosis-report.json | jq '.summary.affectedFiles // 0')

echo -e "发现的路由问题统计:"
echo -e "  - 总问题数: ${TOTAL_ISSUES}"
echo -e "  - 影响文件数: ${TOTAL_FILES}"
echo ""

# 如果没有问题,通过检查
if [ "$TOTAL_ISSUES" -eq 0 ]; then
  echo -e "${GREEN}✅ 路由检查通过 - 未发现硬编码路由${NC}"
  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 0
fi

# 步骤3: 输出详细问题报告
echo -e "${YELLOW}📝 步骤 3/3: 生成问题报告...${NC}"
echo ""

echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}❌ 发现 ${TOTAL_ISSUES} 个路由问题,涉及 ${TOTAL_FILES} 个文件${NC}"
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 按问题类型分组显示
echo -e "${YELLOW}问题分类:${NC}"
cat route-diagnosis-report.json | jq -r '.summary.issuesByType | to_entries[] | "  - \(.key): \(.value)个"'
echo ""

# 显示受影响的文件(最多显示10个)
echo -e "${YELLOW}受影响的文件 (前10个):${NC}"
cat route-diagnosis-report.json | jq -r '.issues | keys[] | "  📄 \(.)"' | head -10
echo ""

if [ "$TOTAL_FILES" -gt 10 ]; then
  echo -e "  ... 还有 $((TOTAL_FILES - 10)) 个文件"
  echo ""
fi

# 显示修复建议
echo -e "${BLUE}📚 修复建议:${NC}"
echo ""
echo -e "1. 查看完整报告:"
echo -e "   ${GREEN}cat route-diagnosis-report.json | jq${NC}"
echo ""
echo -e "2. 运行自动修复:"
echo -e "   ${GREEN}npx tsx scripts/fix-routes-auto.ts${NC}"
echo ""
echo -e "3. 手动修复指南:"
echo -e "   ${GREEN}cat ROUTE_FIX_GUIDE.md${NC}"
echo ""
echo -e "4. 修复后重新检查:"
echo -e "   ${GREEN}./scripts/check-routes-ci.sh${NC}"
echo ""

# 如果是CI环境,显示额外信息
if [ -n "$CI" ]; then
  echo -e "${YELLOW}⚠️  CI环境检测到路由问题${NC}"
  echo -e "此PR无法合并,直到所有路由问题被修复。"
  echo ""
  
  # 生成GitHub Actions注释格式
  if [ -n "$GITHUB_ACTIONS" ]; then
    echo "::error title=路由检查失败::发现 ${TOTAL_ISSUES} 个硬编码路由,请运行 'npx tsx scripts/fix-routes-auto.ts' 修复"
  fi
fi

echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 返回失败状态
exit 1

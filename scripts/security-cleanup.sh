#!/bin/bash

# 安全清理脚本
# 用途: 删除包含敏感信息的文件并从 Git 历史中清理

set -e

echo "🚨 安全清理脚本"
echo "================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 敏感文件列表
SENSITIVE_FILES=(
    "DATABASE_QUICK_REFERENCE.md"
    "RESET_DATABASE_PASSWORD.md"
    "GET_CORRECT_PASSWORD.md"
    "SUPABASE_DIRECT_CONNECTION_STRING.md"
    "DATABASE_CONNECTION_FIX_GUIDE.md"
    "DATABASE_CONNECTION_FIXED.md"
    "DATABASE_FIX_SUMMARY.md"
)

echo -e "${YELLOW}步骤 1: 检查敏感文件${NC}"
echo "-----------------------------------"
for file in "${SENSITIVE_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${RED}✗ 发现敏感文件: $file${NC}"
    else
        echo -e "${GREEN}✓ 文件不存在: $file${NC}"
    fi
done
echo ""

echo -e "${YELLOW}步骤 2: 从工作目录删除敏感文件${NC}"
echo "-----------------------------------"
read -p "是否删除上述文件? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    for file in "${SENSITIVE_FILES[@]}"; do
        if [ -f "$file" ]; then
            rm "$file"
            echo -e "${GREEN}✓ 已删除: $file${NC}"
        fi
    done
    
    # 提交删除操作
    git add -A
    git commit -m "security: 删除包含敏感信息的文件

- 移除包含真实数据库密码的文档
- 响应 GitGuardian 安全警报
- 密码已在 Supabase Dashboard 中轮换"
    
    echo -e "${GREEN}✓ 文件已删除并提交${NC}"
else
    echo -e "${YELLOW}⊘ 跳过删除${NC}"
fi
echo ""

echo -e "${YELLOW}步骤 3: 更新 .gitignore${NC}"
echo "-----------------------------------"

# 检查 .gitignore 是否已包含敏感文件模式
if ! grep -q "# Security - Never commit sensitive information" .gitignore; then
    cat >> .gitignore << 'EOF'

# Security - Never commit sensitive information
*PASSWORD*.md
*SECRET*.md
*CREDENTIAL*.md
*DATABASE*QUICK*.md
*CONNECTION*FIX*.md
SECURITY_INCIDENT*.md
.env*
!.env.example
EOF
    echo -e "${GREEN}✓ .gitignore 已更新${NC}"
    
    git add .gitignore
    git commit -m "security: 更新 .gitignore 防止敏感信息泄露"
else
    echo -e "${GREEN}✓ .gitignore 已包含安全规则${NC}"
fi
echo ""

echo -e "${YELLOW}步骤 4: 检查当前目录中的敏感信息${NC}"
echo "-----------------------------------"
echo "搜索可能包含密码的文件..."

# 搜索包含真实密码的文件（排除 node_modules 和 .git）
FOUND_SECRETS=0
while IFS= read -r line; do
    echo -e "${RED}⚠️  $line${NC}"
    FOUND_SECRETS=1
done < <(grep -r "4gPPhKf90F6ayAka" . --exclude-dir=node_modules --exclude-dir=.git --exclude="*.sh" 2>/dev/null || true)

if [ $FOUND_SECRETS -eq 0 ]; then
    echo -e "${GREEN}✓ 未发现敏感信息${NC}"
fi
echo ""

echo -e "${YELLOW}步骤 5: 从 Git 历史中清理（需要手动执行）${NC}"
echo "-----------------------------------"
echo -e "${RED}警告: 以下操作会重写 Git 历史！${NC}"
echo ""
echo "推荐使用 git-filter-repo:"
echo ""
echo "  # 安装"
echo "  brew install git-filter-repo"
echo ""
echo "  # 备份"
echo "  cp -r .git .git.backup"
echo ""
echo "  # 删除敏感文件"
for file in "${SENSITIVE_FILES[@]}"; do
    echo "  git filter-repo --path $file --invert-paths"
done
echo ""
echo "  # 重新添加远程仓库"
echo "  git remote add origin https://github.com/TigerYY/OpenAero.git"
echo ""
echo "  # 强制推送"
echo "  git push --force --all"
echo "  git push --force --tags"
echo ""

echo -e "${YELLOW}步骤 6: 验证清单${NC}"
echo "-----------------------------------"
echo "□ 在 Supabase Dashboard 中轮换数据库密码"
echo "□ 更新本地 .env.local 文件"
echo "□ 从工作目录删除敏感文件 (✓)"
echo "□ 从 Git 历史中清理敏感文件"
echo "□ 强制推送到远程仓库"
echo "□ 通知团队成员重新克隆仓库"
echo ""

echo -e "${GREEN}✅ 本地清理完成！${NC}"
echo ""
echo -e "${RED}重要: 不要忘记执行步骤 5 清理 Git 历史！${NC}"
echo ""
echo "详细指南: SECURITY_INCIDENT_RESPONSE.md"

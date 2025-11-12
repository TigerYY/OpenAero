#!/bin/bash

# Git 历史清理脚本
# 用途：从 Git 历史中永久删除包含敏感信息的文件

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "🔥 Git 历史清理脚本"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "⚠️  警告：此操作会重写 Git 历史！"
echo "   - 团队成员需要重新克隆仓库"
echo "   - Fork 和 PR 可能受影响"
echo "   - 无法撤销此操作"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 需要从历史中删除的文件
FILES_TO_REMOVE=(
    "DATABASE_QUICK_REFERENCE.md"
    "DATABASE_CONNECTION_FIXED.md"
    "DATABASE_CONNECTION_FIX_GUIDE.md"
    "DATABASE_FIX_SUMMARY.md"
    "RESET_DATABASE_PASSWORD.md"
    "GET_CORRECT_PASSWORD.md"
    "FINAL_PASSWORD_RESET_STEPS.md"
    "SUPABASE_DIRECT_CONNECTION_STRING.md"
)

echo -e "${YELLOW}将要删除的文件:${NC}"
for file in "${FILES_TO_REMOVE[@]}"; do
    echo "  - $file"
done
echo ""

# 确认操作
read -p "$(echo -e ${RED}是否继续? 输入 'YES' 确认: ${NC})" confirm
if [ "$confirm" != "YES" ]; then
    echo -e "${YELLOW}操作已取消${NC}"
    exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 1: 检查依赖"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 检查 git-filter-repo 是否安装
if ! command -v git-filter-repo &> /dev/null; then
    echo -e "${RED}❌ git-filter-repo 未安装${NC}"
    echo ""
    echo "请使用以下命令安装："
    echo "  brew install git-filter-repo"
    echo ""
    echo "或者使用 BFG 替代方案（见 IMMEDIATE_ACTIONS_REQUIRED.md）"
    exit 1
fi

echo -e "${GREEN}✓ git-filter-repo 已安装${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 2: 备份当前仓库"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

BACKUP_DIR=".git.backup.$(date +%Y%m%d_%H%M%S)"
echo "📦 创建备份: $BACKUP_DIR"

cp -r .git "$BACKUP_DIR"
echo -e "${GREEN}✓ 备份完成${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 3: 清理 Git 历史"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for file in "${FILES_TO_REMOVE[@]}"; do
    echo "🗑️  删除: $file"
    git filter-repo --path "$file" --invert-paths --force
done

echo -e "${GREEN}✓ 历史清理完成${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 4: 重新添加远程仓库"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

REMOTE_URL="https://github.com/TigerYY/OpenAero.git"
echo "📡 添加远程仓库: $REMOTE_URL"

git remote add origin "$REMOTE_URL"
echo -e "${GREEN}✓ 远程仓库已添加${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 5: 验证清理结果"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "🔍 检查文件是否仍在历史中..."
FOUND_FILES=0

for file in "${FILES_TO_REMOVE[@]}"; do
    if git log --all --full-history --source -- "$file" 2>&1 | grep -q "commit"; then
        echo -e "${RED}❌ $file 仍在历史中${NC}"
        FOUND_FILES=1
    else
        echo -e "${GREEN}✓ $file 已从历史中删除${NC}"
    fi
done

echo ""

if [ $FOUND_FILES -eq 1 ]; then
    echo -e "${RED}⚠️  警告: 某些文件仍在历史中，可能需要重新运行清理${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 所有敏感文件已从历史中删除！${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 6: 强制推送（可选）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo -e "${YELLOW}⚠️  现在需要强制推送到远程仓库以完成清理${NC}"
echo ""
echo "执行以下命令："
echo ""
echo -e "${BLUE}  git push --force --all${NC}"
echo -e "${BLUE}  git push --force --tags${NC}"
echo ""
echo "⚠️  警告："
echo "  - 这会覆盖远程仓库的历史"
echo "  - 团队成员需要重新克隆仓库"
echo "  - 请确保已通知所有团队成员"
echo ""

read -p "$(echo -e ${RED}是否现在强制推送? (y/n) ${NC})" -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 正在强制推送..."
    git push --force --all
    git push --force --tags
    echo -e "${GREEN}✅ 推送完成！${NC}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Git 历史清理完成！"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "下一步："
    echo "  1. 通知团队成员重新克隆仓库"
    echo "  2. 在 GitHub 上验证敏感信息已删除"
    echo "  3. 更新部署环境的数据库密码"
    echo ""
    echo "备份位置: $BACKUP_DIR"
    echo ""
else
    echo -e "${YELLOW}跳过推送${NC}"
    echo ""
    echo "要完成清理，请手动执行："
    echo "  git push --force --all"
    echo "  git push --force --tags"
    echo ""
fi

echo -e "${GREEN}🎉 脚本执行完成！${NC}"

#!/bin/bash

# Git 历史大文件清理脚本
# 从 Git 历史中移除所有 tar.gz 和 tar 文件

set -e

echo "🧹 Git 历史大文件清理脚本"
echo "================================"
echo ""

# 检查 git-filter-repo
if ! command -v git-filter-repo &> /dev/null; then
    echo "❌ git-filter-repo 未安装"
    echo ""
    echo "正在安装 git-filter-repo..."
    pip3 install --user git-filter-repo
    
    # 添加到 PATH
    export PATH="$HOME/.local/bin:$PATH"
    
    if ! command -v git-filter-repo &> /dev/null; then
        echo "❌ 安装失败，请手动安装："
        echo "   pip3 install --user git-filter-repo"
        echo "   或 brew install git-filter-repo"
        exit 1
    fi
fi

echo "✅ git-filter-repo 已就绪"
echo ""

# 创建备份
echo "📦 步骤 1: 创建备份..."
BACKUP_FILE="backup-before-cleanup-$(date +%Y%m%d_%H%M%S).bundle"
git bundle create "$BACKUP_FILE" --all
echo "✅ 备份已创建: $BACKUP_FILE"
echo ""

# 确认当前分支
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 当前分支: $CURRENT_BRANCH"
echo ""

# 显示将要删除的文件
echo "📋 检测到的历史大文件:"
git rev-list --objects --all | grep -E "\.tar\.gz$|\.tar$" | awk '{print $2}' | sort | uniq
echo ""

# 确认
read -p "⚠️  这将重写 Git 历史。确定继续吗？(yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ 操作已取消"
    exit 1
fi

echo ""
echo "🧹 步骤 2: 从历史中移除 tar.gz 文件..."
git filter-repo --path-glob '*.tar.gz' --invert-paths

echo ""
echo "🧹 步骤 3: 从历史中移除 tar 文件..."
git filter-repo --path-glob '*.tar' --invert-paths

echo ""
echo "✨ 清理完成！"
echo ""

# 验证
echo "🔍 验证：检查历史中是否还有大文件..."
REMAINING=$(git rev-list --objects --all | grep -E "\.tar\.gz$|\.tar$" | wc -l | tr -d ' ')
if [ "$REMAINING" -eq 0 ]; then
    echo "✅ 验证通过：历史中无 tar.gz/tar 文件"
else
    echo "⚠️  警告：仍有 $REMAINING 个大文件在历史中"
fi

echo ""
echo "📤 步骤 4: 推送到远程..."
echo "⚠️  注意：这将使用 --force 推送，重写远程历史"
read -p "确定推送到远程吗？(yes/no): " push_confirm
if [ "$push_confirm" = "yes" ]; then
    git push origin "$CURRENT_BRANCH" --force
    echo "✅ 推送完成！"
else
    echo "⏸️  推送已跳过。可以稍后手动执行："
    echo "   git push origin $CURRENT_BRANCH --force"
fi

echo ""
echo "🎉 清理流程完成！"
echo "📁 备份文件: $BACKUP_FILE"


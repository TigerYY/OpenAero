#!/bin/bash

# 最简单的 Git 历史清理方法
# 使用 BFG，专门处理已修改的仓库

echo "🔥 开始清理 Git 历史（简化版）"
echo "=================================="
echo ""

# 进入仓库目录
cd "$(dirname "$0")"

# 创建文件删除列表
cat > /tmp/files-to-delete.txt << 'EOF'
DATABASE_QUICK_REFERENCE.md
DATABASE_CONNECTION_FIXED.md
DATABASE_CONNECTION_FIX_GUIDE.md
DATABASE_FIX_SUMMARY.md
RESET_DATABASE_PASSWORD.md
GET_CORRECT_PASSWORD.md
FINAL_PASSWORD_RESET_STEPS.md
SUPABASE_DIRECT_CONNECTION_STRING.md
EOF

echo "📝 将要删除的文件:"
cat /tmp/files-to-delete.txt
echo ""

echo "🗑️  执行 BFG 清理..."
bfg --delete-files /tmp/files-to-delete.txt --no-blob-protection .

echo ""
echo "🧹 清理 reflog..."
git reflog expire --expire=now --all

echo ""
echo "📦 压缩仓库..."
git gc --prune=now --aggressive

echo ""
echo "✅ 清理完成！"
echo ""
echo "现在执行以下命令推送到远程："
echo ""
echo "  git push --force origin 006-user-auth-system"
echo ""

# 清理临时文件
rm /tmp/files-to-delete.txt

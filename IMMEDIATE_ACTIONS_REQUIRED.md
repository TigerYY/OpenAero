# 🚨 紧急操作指南

**⚠️ 立即采取行动！数据库密码已泄露到 GitHub！**

---

## 🔥 第一步：立即轮换密码（最紧急！）

### 操作步骤

1. **打开 Supabase Dashboard**

   ```
   https://app.supabase.com/project/cardynuoazvaytvinxvm
   ```

2. **重置数据库密码**
   - 左侧菜单：**Settings** ⚙️
   - 选择：**Database** 🗄️
   - 找到：**Database Password** 部分
   - 点击：**Reset Password** 按钮
   - 复制新密码到密码管理器

3. **更新本地环境变量** 编辑 `.env.local` 文件：

   ```bash
   # 用新密码替换 [NEW-PASSWORD]
   DATABASE_URL="postgresql://postgres.cardynuoazvaytvinxvm:[NEW-PASSWORD]@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
   DIRECT_URL="postgresql://postgres.cardynuoazvaytvinxvm:[NEW-PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres"
   ```

4. **测试连接**
   ```bash
   npm run dev
   # 验证应用可以正常启动
   ```

⏰ **必须在 30 分钟内完成！**

---

## 🧹 第二步：清理敏感文件

### 自动化清理

```bash
# 执行清理脚本
cd /Users/yangyang/Documents/YYCode/OpenAero/openaero.web
./scripts/security-cleanup.sh
```

### 手动清理（如果脚本失败）

```bash
# 删除包含真实密码的文件
rm -f DATABASE_QUICK_REFERENCE.md
rm -f DATABASE_CONNECTION_FIXED.md
rm -f DATABASE_CONNECTION_FIX_GUIDE.md
rm -f DATABASE_FIX_SUMMARY.md
rm -f RESET_DATABASE_PASSWORD.md
rm -f GET_CORRECT_PASSWORD.md
rm -f FINAL_PASSWORD_RESET_STEPS.md
rm -f SUPABASE_DIRECT_CONNECTION_STRING.md

# 提交删除
git add -A
git commit -m "security: 删除包含敏感信息的文件

- 响应 GitGuardian 安全警报
- 移除包含真实数据库密码的文档
- 数据库密码已在 Supabase 中轮换"

# 推送到远程
git push origin 006-user-auth-system
```

---

## 🔄 第三步：清理 Git 历史

### 方法 1: 使用 git-filter-repo（推荐）

```bash
# 1. 安装工具
brew install git-filter-repo

# 2. 备份当前仓库
cd /Users/yangyang/Documents/YYCode/OpenAero/openaero.web
cp -r .git .git.backup.$(date +%Y%m%d_%H%M%S)

# 3. 删除敏感文件的所有历史记录
git filter-repo --path DATABASE_QUICK_REFERENCE.md --invert-paths --force
git filter-repo --path DATABASE_CONNECTION_FIXED.md --invert-paths --force
git filter-repo --path DATABASE_CONNECTION_FIX_GUIDE.md --invert-paths --force
git filter-repo --path DATABASE_FIX_SUMMARY.md --invert-paths --force
git filter-repo --path RESET_DATABASE_PASSWORD.md --invert-paths --force
git filter-repo --path GET_CORRECT_PASSWORD.md --invert-paths --force
git filter-repo --path FINAL_PASSWORD_RESET_STEPS.md --invert-paths --force

# 4. 重新添加远程仓库
git remote add origin https://github.com/TigerYY/OpenAero.git

# 5. 强制推送（清理远程历史）
git push --force --all
git push --force --tags
```

### 方法 2: 使用 BFG Repo-Cleaner

```bash
# 1. 安装 BFG
brew install bfg

# 2. 克隆镜像仓库
cd /Users/yangyang/Documents/YYCode/OpenAero
git clone --mirror https://github.com/TigerYY/OpenAero.git openaero-clean.git
cd openaero-clean.git

# 3. 删除敏感文件
bfg --delete-files DATABASE_QUICK_REFERENCE.md
bfg --delete-files DATABASE_CONNECTION_FIXED.md
bfg --delete-files "DATABASE_*FIX*.md"
bfg --delete-files "*PASSWORD*.md"

# 4. 清理和压缩
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 5. 强制推送
git push --force
```

---

## ✅ 第四步：验证修复

### 检查清单

```bash
# 1. 验证文件已删除
ls -la | grep -E "(DATABASE|PASSWORD)" | grep ".md"
# 应该没有输出

# 2. 验证 Git 历史已清理
git log --all --full-history -- DATABASE_QUICK_REFERENCE.md
# 应该显示 "fatal: ambiguous argument"

# 3. 验证远程仓库
# 访问 GitHub 仓库，搜索 "4gPPhKf90F6ayAka"
# 应该找不到任何结果

# 4. 验证数据库连接
npm run dev
# 应用应该正常启动
```

---

## 🔒 第五步：加强安全措施

### 1. 设置 Pre-commit Hook

```bash
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

# 检测可能的密码泄露
if git diff --cached | grep -E "(postgresql://[^:]+:[^@]+@|password\s*=\s*['\"][^'\"]{8,})" > /dev/null; then
    echo "❌ 检测到可能的敏感信息！"
    echo "请检查提交内容，确保不包含真实密码。"
    exit 1
fi

# 检测敏感文件
SENSITIVE_FILES=(
    "DATABASE_QUICK_REFERENCE.md"
    "*PASSWORD*.md"
    "*SECRET*.md"
    "*CREDENTIAL*.md"
)

for pattern in "${SENSITIVE_FILES[@]}"; do
    if git diff --cached --name-only | grep -E "$pattern" > /dev/null; then
        echo "❌ 检测到敏感文件：$pattern"
        echo "该文件不应提交到 Git！"
        exit 1
    fi
done

echo "✅ Pre-commit 检查通过"
exit 0
EOF

chmod +x .git/hooks/pre-commit
```

### 2. 启用 GitHub Secret Scanning

1. 访问仓库设置
2. **Security** > **Code security and analysis**
3. 启用 **Secret scanning**
4. 启用 **Push protection**

---

## 📊 进度追踪

更新以下清单：

- [ ] **步骤 1**: 轮换数据库密码 (15 分钟)
- [ ] **步骤 2**: 删除敏感文件 (10 分钟)
- [ ] **步骤 3**: 清理 Git 历史 (30 分钟)
- [ ] **步骤 4**: 验证修复完成 (15 分钟)
- [ ] **步骤 5**: 加强安全措施 (20 分钟)

**预计总时间**: 1.5 小时

---

## 🆘 遇到问题？

### 常见问题

**Q: git-filter-repo 提示 "not a valid git repository"**

```bash
# 解决方案：确保在正确的目录
cd /Users/yangyang/Documents/YYCode/OpenAero/openaero.web
git status  # 应该显示 Git 仓库信息
```

**Q: 强制推送失败**

```bash
# 解决方案：确保远程仓库已添加
git remote -v
# 如果没有输出，重新添加
git remote add origin https://github.com/TigerYY/OpenAero.git
```

**Q: 密码更新后应用无法连接**

```bash
# 解决方案：检查环境变量
cat .env.local | grep DATABASE_URL
# 确保密码正确无误，没有多余空格
```

---

## 📞 支持资源

- **Supabase Support**: https://supabase.com/support
- **GitHub Support**: https://support.github.com/contact
- **GitGuardian**: https://www.gitguardian.com

---

## 📝 完成后操作

1. **通知团队成员**

   ```
   团队成员需要重新克隆仓库：
   git clone https://github.com/TigerYY/OpenAero.git
   ```

2. **更新部署环境**
   - 更新生产环境的 DATABASE_URL
   - 更新 CI/CD 的密钥

3. **文档记录**
   - 记录本次安全事件
   - 更新安全操作手册

---

**当前状态**: 🔴 紧急 - 需立即行动  
**责任人**: 开发团队  
**截止时间**: 2 小时内

⚠️ **不要延迟！立即执行第一步！**

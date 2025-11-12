# 🔄 Git 历史清理指南

**问题**: git-filter-repo 遇到 AssertionError  
**原因**: 仓库已经被修改过，存在中间状态  
**解决方案**: 使用 BFG Repo-Cleaner（更适合已修改的仓库）

---

## ⚡ 快速方法（推荐）

### 方法 1: 使用 BFG 自动化脚本

```bash
cd /Users/yangyang/Documents/YYCode/OpenAero/openaero.web
./scripts/cleanup-git-history-bfg.sh
```

脚本会自动：
- ✅ 检查 BFG 是否安装（已安装 ✓）
- ✅ 备份当前仓库
- ✅ 删除敏感文件的历史
- ✅ 清理和压缩仓库
- ✅ 验证结果
- ⏳ 可选：强制推送

---

## 🔧 手动方法（如果脚本失败）

### 步骤 1: 备份仓库

```bash
cd /Users/yangyang/Documents/YYCode/OpenAero/openaero.web
cp -r .git .git.backup.$(date +%Y%m%d_%H%M%S)
```

### 步骤 2: 创建文件删除列表

```bash
cat > files-to-delete.txt << 'EOF'
DATABASE_QUICK_REFERENCE.md
DATABASE_CONNECTION_FIXED.md
DATABASE_CONNECTION_FIX_GUIDE.md
DATABASE_FIX_SUMMARY.md
RESET_DATABASE_PASSWORD.md
GET_CORRECT_PASSWORD.md
FINAL_PASSWORD_RESET_STEPS.md
SUPABASE_DIRECT_CONNECTION_STRING.md
EOF
```

### 步骤 3: 使用 BFG 清理

```bash
# 删除文件
bfg --delete-files files-to-delete.txt .

# 清理 reflog
git reflog expire --expire=now --all

# 压缩仓库
git gc --prune=now --aggressive
```

### 步骤 4: 强制推送

```bash
git push --force origin 006-user-auth-system
```

---

## 🎯 简化方法（推荐给已修改的仓库）

如果上述方法仍有问题，使用这个更温和的方法：

### 方法 2: 只清理特定分支

```bash
cd /Users/yangyang/Documents/YYCode/OpenAero/openaero.web

# 1. 确保在正确的分支
git checkout 006-user-auth-system

# 2. 创建文件列表
cat > files-to-delete.txt << 'EOF'
DATABASE_QUICK_REFERENCE.md
DATABASE_CONNECTION_FIXED.md
DATABASE_CONNECTION_FIX_GUIDE.md
DATABASE_FIX_SUMMARY.md
RESET_DATABASE_PASSWORD.md
GET_CORRECT_PASSWORD.md
FINAL_PASSWORD_RESET_STEPS.md
EOF

# 3. 使用 BFG（只处理当前分支）
bfg --delete-files files-to-delete.txt --no-blob-protection .

# 4. 清理
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 5. 推送
git push --force origin 006-user-auth-system

# 6. 清理临时文件
rm files-to-delete.txt
```

---

## 🆘 如果 BFG 也失败

### 终极方法：重置到干净状态

这个方法会创建一个新的干净分支：

```bash
cd /Users/yangyang/Documents/YYCode/OpenAero/openaero.web

# 1. 创建一个新的孤立分支
git checkout --orphan 006-user-auth-system-clean

# 2. 添加所有当前文件（不包括敏感文件）
git add -A

# 3. 创建初始提交
git commit -m "chore: 重建分支，移除敏感信息历史

- 移除所有包含旧数据库密码的历史记录
- 密码已轮换，新密码安全存储在 .env.local
- 响应 GitGuardian 安全警报"

# 4. 删除旧分支
git branch -D 006-user-auth-system

# 5. 重命名新分支
git branch -m 006-user-auth-system

# 6. 强制推送
git push --force origin 006-user-auth-system
```

**优点**:
- ✅ 100% 干净的历史
- ✅ 不会有任何敏感信息
- ✅ 简单可靠

**缺点**:
- ❌ 会丢失所有 Git 历史
- ❌ 只保留当前状态

---

## 📊 验证清理是否成功

### 本地验证

```bash
# 检查文件是否在历史中
git log --all --full-history -- DATABASE_QUICK_REFERENCE.md

# 预期结果：无输出或 "fatal: ambiguous argument"
```

### GitHub 验证

1. 访问: https://github.com/TigerYY/OpenAero
2. 使用 GitHub 搜索功能
3. 搜索旧密码: `4gPPhKf90F6ayAka`
4. 预期结果: **0 个结果**

---

## 🎯 推荐执行顺序

### 优先级 1: 自动化 BFG 脚本（最简单）

```bash
./scripts/cleanup-git-history-bfg.sh
```

### 优先级 2: 手动 BFG（如果脚本失败）

参考上面的"手动方法"

### 优先级 3: 重置分支（最后手段）

参考"终极方法"

---

## ⚠️ 重要提醒

1. **备份已完成**: 
   - 每次运行脚本都会自动备份
   - 手动备份位置: `.git.backup.YYYYMMDD_HHMMSS`

2. **强制推送影响**:
   - 会覆盖远程分支历史
   - 如有团队成员，需要通知他们重新克隆

3. **验证很重要**:
   - 推送后立即在 GitHub 上验证
   - 确保敏感信息已完全删除

---

## 📝 故障排查

### 问题 1: BFG 报错 "refusing to process"

**解决方案**: 添加 `--no-blob-protection` 参数

```bash
bfg --delete-files files-to-delete.txt --no-blob-protection .
```

### 问题 2: 推送被拒绝

**解决方案**: 使用 `--force` 参数

```bash
git push --force origin 006-user-auth-system
```

### 问题 3: GitHub 仍显示旧内容

**解决方案**: 
1. 等待 5-10 分钟（GitHub 缓存）
2. 联系 GitHub Support 清除缓存

---

## ✅ 完成清单

- [ ] 备份仓库
- [ ] 执行 BFG 清理
- [ ] 清理和压缩仓库
- [ ] 强制推送到远程
- [ ] 在 GitHub 上验证（搜索旧密码）
- [ ] 通知团队成员（如有）
- [ ] 测试应用正常运行

---

**当前状态**: BFG 已安装 ✓  
**推荐方法**: 执行 `./scripts/cleanup-git-history-bfg.sh`  
**预计时间**: 10-15 分钟

# Git 推送失败问题分析与解决方案

**日期**: 2025-10-30  
**错误**: `GH001: Large files detected` - `openaero-web.tar.gz is 153.02 MB`

---

## 🔍 问题根本原因

### 问题 1: Pre-commit Hook 失败
- **错误**: Prettier 未安装 (`spawn prettier ENOENT`)
- **影响**: 阻止本地提交（但可以用 `--no-verify` 跳过）
- **严重性**: ⚠️ 中等（可以跳过）

### 问题 2: Git 历史中的大文件（主要问题）
- **错误**: `File openaero-web.tar.gz is 153.02 MB; this exceeds GitHub's file size limit of 100.00 MB`
- **根本原因**: 
  - ✅ 工作区的 tar.gz 文件已删除
  - ❌ 但这些文件仍然存在于 **Git 历史记录**中
  - GitHub 检查整个提交历史，不只是当前工作区
  
- **严重性**: 🔴 **高**（必须解决才能推送）

---

## 📊 当前状态分析

```
工作区状态: ✅ tar.gz 文件已删除
Git 历史:   ❌ tar.gz 文件仍然存在
推送状态:   ❌ 被 GitHub 拒绝
```

即使工作区没有大文件，只要 Git 历史中包含大文件，GitHub 就会拒绝推送整个分支。

---

## 🛠️ 解决方案

### 方案 A: 使用 git filter-repo 从历史中移除（推荐）

这是最干净的方法，从所有历史提交中移除大文件。

#### 步骤 1: 安装 git-filter-repo
```bash
# macOS
brew install git-filter-repo

# 或使用 pip
pip3 install git-filter-repo
```

#### 步骤 2: 备份当前分支
```bash
# 创建完整备份
git bundle create backup-$(date +%Y%m%d_%H%M%S).bundle --all
```

#### 步骤 3: 从历史中移除所有 tar.gz 文件
```bash
# 移除所有 tar.gz 文件的历史记录
git filter-repo --path-glob '*.tar.gz' --invert-paths

# 如果还有 tar 文件
git filter-repo --path-glob '*.tar' --invert-paths
```

#### 步骤 4: 强制推送
```bash
# ⚠️ 注意：这会重写历史，需要使用 --force
git push origin backup-before-tailwind-fix --force
```

---

### 方案 B: 使用 BFG Repo-Cleaner（更简单）

BFG 是专门用于清理 Git 历史的工具，比 filter-repo 更简单。

#### 步骤 1: 下载 BFG
```bash
# macOS
brew install bfg

# 或下载 JAR 文件
# https://rtyley.github.io/bfg-repo-cleaner/
```

#### 步骤 2: 创建备份
```bash
git clone --mirror https://github.com/TigerYY/OpenAero.git repo-backup.git
```

#### 步骤 3: 清理大文件
```bash
# 移除所有大于 100MB 的文件
bfg --strip-blobs-bigger-than 100M repo-backup.git

# 或移除特定文件
bfg --delete-files '*.tar.gz' repo-backup.git
```

#### 步骤 4: 清理并推送
```bash
cd repo-backup.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 然后推送到远程
git push --force
```

---

### 方案 C: 创建新的干净分支（最简单，但会丢失历史）

如果历史记录不重要，可以创建新分支。

#### 步骤 1: 创建新的干净分支
```bash
# 创建新的孤儿分支（无历史）
git checkout --orphan clean-branch

# 添加当前所有文件
git add -A

# 提交
git commit -m "项目文件清理 - 干净版本（无历史大文件）"
```

#### 步骤 2: 推送到新分支
```bash
git push origin clean-branch
```

---

### 方案 D: 跳过 Pre-commit Hook（临时解决）

如果只想跳过格式检查，可以使用：

```bash
git commit --no-verify -m "项目文件清理"

# 但仍需解决历史大文件问题才能推送
```

---

## ⚠️ 重要警告

### 关于历史重写

如果使用方案 A 或 B：
1. **会重写 Git 历史** - 所有提交的 SHA 都会改变
2. **影响其他开发者** - 如果其他人也在使用这个分支，需要重新克隆
3. **创建备份** - 在执行前务必创建完整备份

### 操作建议

1. ✅ **先备份**: `git bundle create backup.bundle --all`
2. ✅ **确认分支**: 确保在正确的分支上操作
3. ✅ **测试本地**: 历史重写后，先测试本地仓库
4. ✅ **通知团队**: 如果这是共享分支，通知其他成员

---

## 🎯 推荐执行步骤

### 快速方案（适合个人项目）

```bash
# 1. 创建备份
git bundle create backup-$(date +%Y%m%d).bundle --all

# 2. 安装 git-filter-repo（如果未安装）
brew install git-filter-repo || pip3 install git-filter-repo

# 3. 移除大文件历史
git filter-repo --path-glob '*.tar.gz' --invert-paths
git filter-repo --path-glob '*.tar' --invert-paths

# 4. 强制推送
git push origin backup-before-tailwind-fix --force
```

### 安全方案（适合团队项目）

```bash
# 1. 创建新分支（保留原分支作为备份）
git checkout -b project-cleanup-20251030

# 2. 创建干净的提交
git add -A
git commit --no-verify -m "项目文件清理 - 干净版本"

# 3. 推送到新分支
git push origin project-cleanup-20251030
```

---

## 📝 执行检查清单

在操作前确认：

- [ ] 已创建 Git 备份包（`.bundle` 文件）
- [ ] 确认当前分支名称
- [ ] 确认远程仓库地址
- [ ] 已通知团队成员（如果是共享分支）
- [ ] 已备份重要工作（如有未提交更改）

---

## 🔄 验证步骤

操作后验证：

```bash
# 1. 确认大文件已从历史中移除
git rev-list --objects --all | grep -E "\.tar\.gz$"

# 应该返回空结果

# 2. 检查仓库大小
du -sh .git

# 3. 尝试推送到测试分支
git push origin backup-before-tailwind-fix --dry-run
```

---

**需要帮助？** 我可以协助执行上述任何一个方案。


# Supabase Auth 账号清理指南

## 📊 当前状态

**总用户数**: 15个  
**分析时间**: 2025年11月12日

---

## ✅ 必须保留的账号 (1个)

### 核心生产账号

1. **admin@openaero.com**
   - ✅ 已验证
   - 角色: USER (⚠️ 建议升级为 ADMIN)
   - 最后登录: 2025/11/10
   - **用途**: 主要管理员账号
   - **操作**: 保留并升级角色

---

## 🧪 测试账号分析 (14个)

### 明确的测试账号 (可安全删除)

#### 1. example.com 域名账号 (7个) - 建议删除

- alice@example.com - ❌ 未验证
- bob@example.com - ❌ 未验证
- charlie@example.com - ❌ 未验证
- creator1@example.com - ❌ 未验证
- buyer1@example.com - ❌ 未验证
- supplier1@example.com - ❌ 未验证
- testuser@example.com - ✅ 已验证 (但明显是测试账号)

**原因**: example.com 是明确的测试域名，这些账号无实际业务价值

#### 2. testuser 开头的账号 (1个)

- testuser@gmail.com - ❌ 未验证，创建于 2025/11/9

**原因**: 命名模式明确表明是测试账号

### 疑似测试账号 (需确认)

#### 3. test* 开头的已验证账号 (5个)

- test1@outlook.com - ✅ 已验证，最后登录 2025/11/10
- test2@outlook.com - ✅ 已验证，最后登录 2025/11/10
- testuser1@gmail.com - ✅ 已验证，最后登录 2025/11/10
- testuser2@gmail.com - ✅ 已验证，最后登录 2025/11/10
- testuser3@gmail.com - ✅ 已验证，最后登录 2025/11/10

**特点**:
- 都已完成邮箱验证
- 最近有登录记录
- 使用真实的邮箱服务商 (outlook.com, gmail.com)

**建议**: 
- 如果这些是你用于测试的账号 → 可以删除
- 如果这些是真实用户（恰好叫test开头）→ 应该保留

#### 4. 演示账号 (1个)

- demo@openaero.com - ✅ 已验证，最后登录 2025/11/10

**建议**: 如果用于产品演示可保留，否则删除

#### 5. 未验证的新账号 (1个)

- user@openaero.cn - ❌ 未验证，创建于 2025/11/10，从未登录

**建议**: 观察7天，如仍未验证则删除

---

## 🎯 推荐的清理方案

### 方案A: 保守清理 ⭐ (推荐)

**删除**: 8个账号
- 所有 @example.com 域名账号 (7个)
- testuser@gmail.com (1个)

**保留**: 7个账号
- admin@openaero.com (管理员)
- demo@openaero.com (演示)
- test1-2@outlook.com (待确认)
- testuser1-3@gmail.com (待确认)
- user@openaero.cn (观察7天)

**执行命令**:
```bash
node scripts/delete-test-accounts.js --plan=conservative
```

### 方案B: 彻底清理

**删除**: 14个账号
- 所有测试账号
- 所有未验证账号

**保留**: 1个账号
- admin@openaero.com (管理员)

**执行命令**:
```bash
node scripts/delete-test-accounts.js --plan=thorough
```

### 方案C: 最小清理

**删除**: 7个账号
- 仅删除 @example.com 域名账号

**保留**: 8个账号
- 其他所有账号

**执行命令**:
```bash
node scripts/delete-test-accounts.js --plan=exampleOnly
```

---

## 📝 清理步骤

### 1. 预览要删除的账号

```bash
cd /Users/yangyang/Documents/YYCode/OpenAero/openaero.web

# 预览方案A
node scripts/delete-test-accounts.js --plan=conservative

# 预览方案B
node scripts/delete-test-accounts.js --plan=thorough

# 预览方案C
node scripts/delete-test-accounts.js --plan=exampleOnly
```

### 2. 确认并执行删除

**⚠️ 重要**: 删除操作不可恢复！请仔细检查要删除的账号。

```bash
# 执行方案A (推荐)
node scripts/delete-test-accounts.js --plan=conservative --execute

# 系统会要求你输入 YES 确认
```

### 3. 验证删除结果

```bash
# 重新分析账号
node scripts/analyze-and-save-report.js

# 查看报告
cat SUPABASE_USERS_ANALYSIS.md
```

---

## 🔧 后续操作

### 1. 升级管理员权限

在Supabase Dashboard中:
1. 访问 Authentication > Users
2. 找到 admin@openaero.com
3. 编辑用户，将 role 设置为 `ADMIN`

或使用数据库更新:
```sql
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"ADMIN"'
)
WHERE email = 'admin@openaero.com';
```

### 2. 配置邮箱验证

确保 Supabase 邮箱验证功能已启用:
1. Authentication > Settings
2. 启用 "Confirm email"
3. 配置邮件模板

### 3. 创建演示账号 (可选)

如果需要演示账号:
```bash
# 创建特定角色的演示账号
- demo-admin@openaero.com (管理员演示)
- demo-creator@openaero.com (创作者演示)
- demo-buyer@openaero.com (买家演示)
```

### 4. 定期清理策略

建议设置定期清理规则:
- 每月1号运行分析脚本
- 删除超过30天未验证的账号
- 删除超过90天未登录的账号 (演示账号除外)

---

## 📊 清理前后对比

### 清理前
- 总账号: 15个
- 已验证: 7个
- 未验证: 8个
- 测试账号: 12-14个
- 生产账号: 1个

### 清理后 (方案A)
- 总账号: 7个
- 已验证: 6个
- 未验证: 1个
- 测试账号: 5-6个 (待确认)
- 生产账号: 1个

### 清理后 (方案B)
- 总账号: 1个
- 已验证: 1个
- 未验证: 0个
- 测试账号: 0个
- 生产账号: 1个

---

## ⚠️ 注意事项

1. **备份数据**: 删除前确保已备份重要数据
2. **确认账号**: 再次确认要删除的账号不是真实用户
3. **不可恢复**: Supabase Auth 用户删除后无法恢复
4. **级联删除**: 删除用户可能会级联删除相关数据（如果有外键约束）
5. **测试环境**: 建议先在测试项目上验证删除流程

---

## 🛠️ 工具脚本说明

### 分析脚本
- `scripts/analyze-supabase-users.js` - 分析所有用户并生成报告
- `scripts/analyze-and-save-report.js` - 生成Markdown格式的详细报告

### 清理脚本
- `scripts/delete-test-accounts.js` - 智能批量删除工具
  - 支持多种清理方案
  - 预览模式防止误删
  - 需要确认才执行删除

### 生成的报告
- `SUPABASE_USERS_ANALYSIS.md` - 完整的用户分析报告
- `SUPABASE_ACCOUNTS_SUMMARY.md` - 账号清理总结
- `SUPABASE_CLEANUP_GUIDE.md` - 本指南

---

## ✅ 推荐执行计划

**第1步**: 立即执行方案A (保守清理)
```bash
node scripts/delete-test-accounts.js --plan=conservative --execute
```

**第2步**: 确认剩余的test账号是否为真实用户
- 如果是测试账号 → 手动删除或执行方案B
- 如果是真实用户 → 保留

**第3步**: 升级 admin@openaero.com 为 ADMIN 角色

**第4步**: 观察 user@openaero.cn 7天，如未验证则删除

**第5步**: 根据需要创建正式的演示账号

---

**最终建议**: 先执行**方案A (保守清理)**，删除明确的测试账号，然后根据业务需要决定是否进一步清理。

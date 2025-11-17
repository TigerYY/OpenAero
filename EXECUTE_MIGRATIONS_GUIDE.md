# 🚀 正确的迁移执行方式

## ⚠️ 重要说明

**不要在 SQL Editor 手动执行迁移文件！**

迁移文件应该通过 Supabase CLI 或者项目的迁移系统自动执行。

---

## 方式 A：使用 Supabase CLI（推荐）

### 前提条件

```bash
# 1. 安装 Supabase CLI（如果还没安装）
npm install -g supabase

# 2. 登录 Supabase
supabase login

# 3. 链接到你的项目
supabase link --project-ref YOUR_PROJECT_REF
```

### 执行迁移

```bash
# 在项目根目录执行

# 1. 查看待执行的迁移
supabase db diff

# 2. 推送迁移到远程数据库
supabase db push

# 这会自动执行 supabase/migrations/ 目录下的所有未执行的迁移
```

---

## 方式 B：本地开发时使用 Supabase Local

```bash
# 1. 启动本地 Supabase
supabase start

# 2. 迁移会自动应用到本地数据库

# 3. 开发完成后，推送到远程
supabase db push
```

---

## 方式 C：手动执行（临时方案，不推荐）

如果你确实需要手动执行（例如紧急修复），可以这样做：

### 步骤 1: 在 Supabase Dashboard 执行

1. 打开 Supabase Dashboard
2. 进入 **SQL Editor**
3. 创建新查询
4. **分别**复制以下两个文件的内容并执行

#### 文件 1: `014_complete_auth_fix.sql`

```sql
-- 复制 supabase/migrations/014_complete_auth_fix.sql 的全部内容
-- 粘贴到 SQL Editor
-- 点击 "Run" 执行
```

**预期结果**:
```
✅ RLS is enabled on user_profiles
✅ Found 6 RLS policies
✅ Trigger on_auth_user_created exists
✅ Function handle_new_user has SECURITY DEFINER
✅ All users have profiles
🎉 Migration completed successfully!
```

#### 文件 2: `015_disable_business_tables_rls.sql`

```sql
-- 复制 supabase/migrations/015_disable_business_tables_rls.sql 的全部内容
-- 粘贴到 SQL Editor
-- 点击 "Run" 执行
```

**预期结果**:
```
✅ Auth tables RLS is properly configured
✅ All business tables have RLS disabled
📊 RLS Configuration Summary
  Total tables in public schema: 24
  Tables with RLS enabled: 2
  Tables with RLS disabled: 22
🎉 Migration completed successfully!
```

### 步骤 2: 记录迁移历史（重要！）

手动执行后，需要在 Supabase 的 `schema_migrations` 表中记录迁移历史：

```sql
-- 在 SQL Editor 执行
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES 
  ('014', '014_complete_auth_fix'),
  ('015', '015_disable_business_tables_rls')
ON CONFLICT (version) DO NOTHING;
```

---

## 方式 D：使用 Prisma Migrate（如果你在用 Prisma）

```bash
# 1. 生成迁移
npx prisma migrate dev --name complete_auth_fix

# 2. 应用到生产
npx prisma migrate deploy
```

**注意**: 但你的迁移文件是 SQL 格式，不是 Prisma 格式，所以这个方法不适用。

---

## ⭐ 推荐流程（最佳实践）

### 开发环境

```bash
# 1. 本地开发
supabase start

# 2. 创建迁移（自动或手动）
# 文件保存在 supabase/migrations/

# 3. 测试迁移
supabase db reset  # 重置并重新应用所有迁移

# 4. 确认无误后提交代码
git add supabase/migrations/
git commit -m "Add complete auth fix migration"
```

### 生产环境

```bash
# 1. 推送到远程
supabase db push

# 或者在 CI/CD 中自动执行
```

---

## 🔍 验证迁移是否执行成功

### 检查 RLS 状态

```sql
-- 在 SQL Editor 执行
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rls_status DESC, tablename;
```

**预期结果**:
```
user_profiles        ✅ ENABLED
creator_profiles     ✅ ENABLED
solutions            ❌ DISABLED
orders               ❌ DISABLED
products             ❌ DISABLED
... (其他 19 张表)  ❌ DISABLED
```

### 检查触发器

```sql
-- 在 SQL Editor 执行
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

**预期结果**:
```
on_auth_user_created | INSERT | users
```

### 检查策略数量

```sql
-- 在 SQL Editor 执行
SELECT 
  tablename,
  COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count DESC;
```

**预期结果**:
```
user_profiles       6
creator_profiles    3
(其他表没有策略)
```

---

## ❓ 常见问题

### Q1: 我应该用哪种方式？

**A**: 
- **如果你有 Supabase CLI** → 使用方式 A（`supabase db push`）
- **如果是紧急修复** → 使用方式 C（手动执行）
- **如果是本地开发** → 使用方式 B（`supabase start`）

### Q2: 手动执行后会有什么问题？

**A**: 
- ⚠️ 迁移历史未记录（需要手动插入 `schema_migrations`）
- ⚠️ 团队其他成员不知道迁移已执行
- ⚠️ CI/CD 可能会重复执行

### Q3: 我已经手动执行了一部分怎么办？

**A**: 
```bash
# 1. 检查哪些迁移已执行
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC;

# 2. 手动记录已执行的迁移
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('014', '014_complete_auth_fix')
ON CONFLICT (version) DO NOTHING;

# 3. 继续使用 CLI 执行后续迁移
supabase db push
```

### Q4: 执行迁移时报错怎么办？

**A**: 常见错误及解决方案

#### 错误 1: `relation "xxx" does not exist`
```sql
-- 原因：表不存在
-- 解决：先检查表是否存在
SELECT tablename FROM pg_tables WHERE tablename = 'xxx';
```

#### 错误 2: `policy "xxx" already exists`
```sql
-- 原因：策略已存在
-- 解决：迁移文件中使用 DROP POLICY IF EXISTS
DROP POLICY IF EXISTS "policy_name" ON table_name;
CREATE POLICY "policy_name" ...
```

#### 错误 3: `function "xxx" does not exist`
```sql
-- 原因：函数不存在
-- 解决：先检查函数
SELECT proname FROM pg_proc WHERE proname = 'xxx';
```

---

## 📝 当前项目的执行步骤（快速指南）

### 如果你有 Supabase CLI

```bash
# 1. 确保已链接项目
supabase link --project-ref YOUR_PROJECT_REF

# 2. 推送迁移
supabase db push

# 3. 验证
supabase db diff
# 应该显示 "No schema changes detected"
```

### 如果没有 Supabase CLI（手动执行）

```bash
# 步骤 1: 打开 Supabase Dashboard
open https://app.supabase.com/project/YOUR_PROJECT/sql

# 步骤 2: 在 SQL Editor 中执行
# 复制 supabase/migrations/014_complete_auth_fix.sql
# 粘贴 → 点击 "Run"

# 步骤 3: 执行第二个迁移
# 复制 supabase/migrations/015_disable_business_tables_rls.sql
# 粘贴 → 点击 "Run"

# 步骤 4: 验证
# 使用上面的验证 SQL 查询
```

---

## ✅ 执行完成后的检查清单

- [ ] RLS 状态正确（2 张表启用，22 张表关闭）
- [ ] 触发器存在（`on_auth_user_created`）
- [ ] 策略数量正确（`user_profiles`: 6, `creator_profiles`: 3）
- [ ] 所有用户都有 profiles（无 missing）
- [ ] 注册新用户测试通过
- [ ] 邮箱验证流程正常

---

## 🎯 下一步

执行完迁移后：

1. ✅ 配置 Supabase Redirect URLs
2. ✅ 设置双语邮件模板
3. ✅ 测试完整的注册流程
4. ✅ 验证权限检查正常工作

详细步骤请参考 `FINAL_RLS_SOLUTION.md`

---

**总结**: 推荐使用 `supabase db push`，但如果紧急可以手动执行。记得验证！🚀

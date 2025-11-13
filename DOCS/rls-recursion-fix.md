# RLS 无限递归问题修复

## 问题描述

访问 `/profile` 或 `/settings` 页面时，出现以下错误：

```
42P17 infinite recursion detected in policy for relation "user_profiles"
```

## 问题原因

在 `001_create_user_profiles.sql` 中定义的管理员 RLS 策略存在无限递归：

```sql
CREATE POLICY "Admins can manage all profiles"
  ON public.user_profiles
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles  -- ❌ 这里查询 user_profiles 表
      WHERE user_id = auth.uid()
      AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );
```

**递归过程**：
1. 查询 `user_profiles` 表
2. RLS 策略检查用户是否是管理员
3. 策略本身又查询 `user_profiles` 表来检查角色
4. 这又触发了 RLS 策略检查
5. 无限循环...

## 解决方案

创建 `SECURITY DEFINER` 函数来检查用户角色，函数执行时会绕过 RLS，避免递归：

```sql
CREATE OR REPLACE FUNCTION public.is_admin_user(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = user_uuid
    AND role IN ('ADMIN', 'SUPER_ADMIN')
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

然后使用这个函数在策略中：

```sql
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
  FOR SELECT
  USING (
    auth.uid() = user_id  -- 用户可以查看自己的
    OR public.is_admin_user(auth.uid())  -- 或管理员可以查看所有
  );
```

## 修复步骤

### 方法 1: 使用迁移文件（推荐）

1. 运行迁移文件：
   ```bash
   # 如果使用 Supabase CLI
   supabase migration up
   
   # 或直接在 Supabase Dashboard > SQL Editor 中执行
   # supabase/migrations/004_fix_user_profiles_rls_recursion.sql
   ```

2. 验证修复：
   - 刷新页面 `http://localhost:3000/zh-CN/profile`
   - 检查浏览器控制台，应该不再有递归错误

### 方法 2: 手动在 Supabase Dashboard 中修复

1. 打开 Supabase Dashboard > SQL Editor

2. 执行以下 SQL：

```sql
-- 创建检查用户角色的函数（绕过 RLS）
CREATE OR REPLACE FUNCTION public.is_admin_user(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = user_uuid
    AND role IN ('ADMIN', 'SUPER_ADMIN')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 删除有问题的策略
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "管理员可以查看所有用户资料" ON public.user_profiles;

-- 重新创建管理员策略（使用函数避免递归）
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can update all profiles" ON public.user_profiles
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR public.is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can insert profiles" ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can delete profiles" ON public.user_profiles
  FOR DELETE
  USING (
    public.is_admin_user(auth.uid())
  );
```

3. 验证修复：
   - 刷新页面
   - 检查浏览器控制台

## 验证修复

修复后，应该能够：

1. ✅ 正常访问 `/profile` 页面
2. ✅ 正常访问 `/settings` 页面
3. ✅ API `/api/users/me` 返回 200 而不是 500
4. ✅ 浏览器控制台不再有递归错误

## 技术说明

### SECURITY DEFINER 函数

`SECURITY DEFINER` 函数以函数创建者的权限执行，而不是调用者的权限。这意味着：

- 函数内部查询 `user_profiles` 表时，会绕过 RLS
- 避免了策略检查时的递归问题
- 函数本身仍然安全，因为它只检查传入的 `user_uuid`

### 为什么这样安全？

1. 函数只检查传入的 UUID，不能修改数据
2. 函数只返回布尔值，不返回敏感数据
3. 策略仍然控制实际的 SELECT/UPDATE/INSERT/DELETE 操作
4. 只有管理员才能通过策略访问所有记录

## 相关文件

- `supabase/migrations/004_fix_user_profiles_rls_recursion.sql` - 修复迁移文件
- `supabase/migrations/001_create_user_profiles.sql` - 原始有问题的策略
- `supabase/migrations/001_create_user_tables.sql` - 另一个有问题的策略定义


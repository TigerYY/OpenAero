# RLS 无限递归问题修复总结

## 问题描述

访问 `/profile` 或 `/settings` 页面时，出现以下错误：

```
42P17 infinite recursion detected in policy for relation "user_profiles"
```

API `/api/users/me` 返回 500 错误，页面显示"无法加载用户资料"。

## 问题根源

在 `supabase/migrations/001_create_user_profiles.sql` 中定义的管理员 RLS 策略存在无限递归：

```sql
-- ❌ 有问题的策略
CREATE POLICY "Admins can manage all profiles"
  ON public.user_profiles
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles  -- 这里查询 user_profiles 表
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
-- ✅ 修复方案
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

## 修复文件

- **迁移文件**: `supabase/migrations/004_fix_user_profiles_rls_recursion.sql`
- **文档**: `DOCS/rls-recursion-fix.md`
- **验证脚本**: `scripts/verify-rls-fix.js`

## 修复结果

✅ **修复成功** - 2024年执行修复后验证：

- ✅ `/profile` 页面正常显示
- ✅ `/settings` 页面正常显示
- ✅ API `/api/users/me` 返回 200 状态码
- ✅ 浏览器控制台不再有递归错误
- ✅ 用户可以正常查看和编辑个人信息

## 技术要点

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

- `supabase/migrations/001_create_user_profiles.sql` - 原始有问题的策略
- `supabase/migrations/001_create_user_tables.sql` - 另一个有问题的策略定义
- `supabase/migrations/004_fix_user_profiles_rls_recursion.sql` - 修复迁移文件

## 经验教训

1. **避免在 RLS 策略中查询同一张表**
   - 会导致无限递归
   - 使用 `SECURITY DEFINER` 函数来绕过 RLS

2. **测试 RLS 策略**
   - 在开发环境中充分测试
   - 检查是否有递归问题

3. **使用函数封装复杂逻辑**
   - 将权限检查逻辑封装到函数中
   - 提高代码可维护性

## 后续改进

可以考虑：

1. 为其他表也创建类似的 `SECURITY DEFINER` 函数
2. 统一管理员权限检查逻辑
3. 添加单元测试验证 RLS 策略


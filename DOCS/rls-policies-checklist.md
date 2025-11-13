# RLS 策略配置检查清单

## user_profiles 表策略（已修复）

### 应该存在的策略：

1. ✅ **Public profiles are viewable by everyone** (SELECT)
   - 允许所有人查看用户资料（公开信息）

2. ✅ **Users can update own profile** (UPDATE)
   - 用户只能更新自己的资料

3. ✅ **Users can insert own profile** (INSERT)
   - 用户只能插入自己的资料（如果触发器失败）

4. ✅ **Admins can view all profiles** (SELECT)
   - 管理员可以查看所有用户资料

5. ✅ **Admins can update all profiles** (UPDATE)
   - 管理员可以更新所有用户资料

6. ✅ **Admins can insert profiles** (INSERT)
   - 管理员可以插入任何用户资料

7. ✅ **Admins can delete profiles** (DELETE)
   - 只有管理员可以删除用户资料

### 检查方法：

在 Supabase Dashboard > Authentication > Policies 中：

1. 找到 `user_profiles` 表
2. 确认 RLS 已启用（不是 "RLS Disabled"）
3. 检查是否有以上策略
4. 确认策略使用 `is_admin_user()` 函数而不是直接查询表

## 其他表的 RLS 状态

### 需要启用 RLS 的表：

1. **applications** - 当前 RLS Disabled ⚠️
   - 应该启用 RLS 并创建策略

2. **bookmarks** - 当前 RLS Disabled ⚠️
   - 应该启用 RLS 并创建策略

3. **categories** - 当前 RLS Disabled ⚠️
   - 应该启用 RLS 并创建策略

4. **files** - 当前 RLS Disabled ⚠️
   - 应该启用 RLS 并创建策略

### 已正确配置的表：

1. ✅ **audit_logs** - RLS Enabled
   - 策略："管理员可以查看审计日志" (SELECT)

2. ✅ **creator_profiles** - RLS Enabled
   - 策略："创作者可以查看自己的资料" (SELECT)
   - 策略："创作者可以更新自己的资料" (UPDATE)

## 建议的修复步骤

### 1. 检查 user_profiles 表策略

在 Supabase Dashboard 中：

1. 打开 Authentication > Policies
2. 在搜索框中输入 "user_profiles"
3. 确认表存在且 RLS 已启用
4. 检查策略列表

如果看不到 `user_profiles` 表：
- 检查 schema 过滤器是否设置为 "public"
- 尝试刷新页面
- 检查表是否真的存在（Table Editor）

### 2. 为其他表启用 RLS（可选，但推荐）

根据业务需求，为以下表启用 RLS：

- **applications** - 申请记录，应该只有相关用户可以查看
- **bookmarks** - 书签，应该只有用户自己可以查看
- **categories** - 分类，可能是公开的
- **files** - 文件，应该根据权限控制访问

## 验证 user_profiles 策略

运行以下 SQL 检查策略：

```sql
-- 检查 user_profiles 表的策略
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_profiles'
ORDER BY cmd, policyname;
```

## 常见问题

### Q: 为什么看不到 user_profiles 表？

A: 可能的原因：
1. Schema 过滤器不是 "public"
2. 表不存在（检查 Table Editor）
3. 权限问题

### Q: 策略中是否还有递归问题？

A: 检查策略定义，确保：
- 不使用 `EXISTS (SELECT 1 FROM user_profiles WHERE ...)` 直接查询
- 使用 `is_admin_user(auth.uid())` 函数

### Q: 其他表需要立即启用 RLS 吗？

A: 取决于业务需求：
- 如果表包含敏感数据，应该启用
- 如果表是公开的（如 categories），可以稍后处理
- 建议先完成 user_profiles 的验证


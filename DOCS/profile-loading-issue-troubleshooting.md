# Profile 加载问题排查指南

## 问题描述

访问 `/profile` 或 `/settings` 页面时，显示"无法加载用户资料"和"您的账号资料正在初始化中..."。

## 问题原因

这个错误通常发生在以下情况：

1. **用户已登录**（`user` 存在）
2. **但 `user_profiles` 表中没有对应的记录**（`profile` 为 `null`）

### 常见原因

1. **新注册用户**：注册时数据库触发器未正确创建 `user_profiles` 记录
2. **数据库触发器缺失**：`user_profiles` 表的触发器未配置或失效
3. **RLS 策略问题**：Row Level Security 策略阻止了查询或创建
4. **权限问题**：Supabase 客户端权限不足

## 诊断步骤

### 步骤 1: 检查浏览器控制台

1. 打开浏览器开发者工具（F12）
2. 查看 Console 标签页
3. 查找以下错误信息：
   - `获取用户资料失败`
   - `创建用户profile失败`
   - `PGRST116` 或其他错误代码

### 步骤 2: 检查用户 ID

1. 在浏览器控制台运行：
   ```javascript
   // 获取当前用户 ID
   const { data } = await supabase.auth.getUser();
   console.log('User ID:', data.user?.id);
   ```

2. 记录用户 ID

### 步骤 3: 使用诊断脚本

运行诊断脚本检查用户 profile：

```bash
node scripts/check-user-profile.js <user_id>
```

脚本会：
- 检查 `auth.users` 中是否存在用户
- 检查 `user_profiles` 中是否存在 profile
- 如果不存在，尝试创建
- 显示详细的错误信息

### 步骤 4: 检查 Supabase Dashboard

1. **检查 `user_profiles` 表**：
   - 打开 Supabase Dashboard
   - 进入 Table Editor
   - 查看 `user_profiles` 表
   - 搜索你的 `user_id`

2. **检查数据库触发器**：
   - 进入 Database > Functions
   - 查找创建 profile 的触发器
   - 确认触发器已启用

3. **检查 RLS 策略**：
   - 进入 Authentication > Policies
   - 查看 `user_profiles` 表的策略
   - 确认允许用户查询和创建自己的 profile

## 解决方案

### 方案 1: 手动创建 Profile（临时解决）

如果诊断脚本显示 profile 不存在，可以手动创建：

```sql
INSERT INTO user_profiles (user_id, role, status)
VALUES ('your-user-id', 'USER', 'ACTIVE');
```

### 方案 2: 修复数据库触发器

确保注册时自动创建 profile。检查并修复触发器：

```sql
-- 检查触发器是否存在
SELECT * FROM pg_trigger WHERE tgname = 'create_user_profile_trigger';

-- 如果不存在，创建触发器
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, role, status)
  VALUES (NEW.id, 'USER', 'ACTIVE');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_user_profile_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_user_profile();
```

### 方案 3: 修复 RLS 策略

确保 RLS 策略允许用户操作自己的 profile：

```sql
-- 允许用户查询自己的 profile
CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = user_id);

-- 允许用户创建自己的 profile
CREATE POLICY "Users can create own profile"
ON user_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 允许用户更新自己的 profile
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = user_id);
```

### 方案 4: 使用 API 端点创建

如果直接数据库操作失败，可以通过 API 端点创建：

1. 确保已登录
2. 访问 `/api/users/me`（GET 请求）
3. API 会自动尝试创建 profile（如果不存在）

## 预防措施

### 1. 改进注册流程

确保注册时正确创建 profile：

```typescript
// 在注册 API 中
const { user, error } = await supabase.auth.signUp({...});

if (user && !error) {
  // 确保 profile 已创建
  await ensureUserProfile(user.id);
}
```

### 2. 添加监控

监控 profile 创建失败的情况：

```typescript
// 在 AuthContext 中
if (error.code === 'PGRST116') {
  // 记录到监控系统
  logError('Profile not found for user', { userId });
}
```

## 已实施的改进

1. ✅ **改进 `refreshProfile`**：优先使用 API 端点获取完整用户信息
2. ✅ **改进 `fetchUserProfile`**：更好的错误处理和自动创建逻辑
3. ✅ **改进页面错误处理**：区分不同错误情况，提供更友好的提示
4. ✅ **添加"重新初始化"按钮**：允许用户手动触发 profile 创建

## 测试验证

修复后，验证以下场景：

1. ✅ 新用户注册后能正常访问 profile 页面
2. ✅ 已登录用户能正常加载 profile
3. ✅ Profile 不存在时能自动创建
4. ✅ 错误提示清晰友好

## 联系支持

如果问题持续存在，请提供以下信息：

1. 用户 ID
2. 浏览器控制台错误信息
3. 诊断脚本输出
4. Supabase Dashboard 截图


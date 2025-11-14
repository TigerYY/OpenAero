# Supabase Storage RLS 策略设置指南

## ⚠️ 重要提示

**Storage 的 RLS 策略不能通过 SQL 直接设置**，因为 `storage.objects` 表是 Supabase 管理的系统表，需要特殊权限。

**必须通过 Supabase Dashboard UI 来设置 Storage 策略。**

## 设置步骤

### 1. 创建 avatars Bucket（如果尚未创建）

1. 打开 Supabase Dashboard
2. 进入你的项目
3. 点击左侧菜单的 **"Storage"**
4. 点击 **"New bucket"**
5. 配置：
   - **Bucket 名称**: `avatars`
   - **Public bucket**: ✅ **勾选**（允许公开访问头像）
   - **File size limit**: `5242880` (5MB)
   - **Allowed MIME types**: `image/jpeg,image/png,image/webp,image/gif`
6. 点击 **"Create bucket"**

### 2. 设置 Storage RLS 策略

在 Supabase Dashboard 中按以下步骤操作：

#### 策略 1: 允许用户上传自己的头像

1. 进入 **Storage** > **avatars** > **Policies** 标签页
2. 点击 **"New Policy"**
3. 选择 **"Create a policy from scratch"**
4. 配置：
   - **Policy name**: `Users can upload own avatar`
   - **Allowed operation**: `INSERT`
   - **Target roles**: `authenticated`
   - **Policy definition (WITH CHECK expression)**: 
     ```sql
     bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[2]
     ```
   - **Policy definition (USING expression)**: 留空
5. 点击 **"Review"** 然后 **"Save policy"**

#### 策略 2: 允许用户更新自己的头像

1. 点击 **"New Policy"**
2. 选择 **"Create a policy from scratch"**
3. 配置：
   - **Policy name**: `Users can update own avatar`
   - **Allowed operation**: `UPDATE`
   - **Target roles**: `authenticated`
   - **Policy definition (USING expression)**: 
     ```sql
     bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[2]
     ```
   - **Policy definition (WITH CHECK expression)**: 留空
4. 点击 **"Review"** 然后 **"Save policy"**

#### 策略 3: 允许用户删除自己的头像

1. 点击 **"New Policy"**
2. 选择 **"Create a policy from scratch"**
3. 配置：
   - **Policy name**: `Users can delete own avatar`
   - **Allowed operation**: `DELETE`
   - **Target roles**: `authenticated`
   - **Policy definition (USING expression)**: 
     ```sql
     bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[2]
     ```
   - **Policy definition (WITH CHECK expression)**: 留空
4. 点击 **"Review"** 然后 **"Save policy"**

#### 策略 4: 允许所有人查看头像（公开访问）

1. 点击 **"New Policy"**
2. 选择 **"Create a policy from scratch"**
3. 配置：
   - **Policy name**: `Anyone can view avatars`
   - **Allowed operation**: `SELECT`
   - **Target roles**: `anon, authenticated`（或留空表示所有人）
   - **Policy definition (USING expression)**: 
     ```sql
     bucket_id = 'avatars'
     ```
   - **Policy definition (WITH CHECK expression)**: 留空
4. 点击 **"Review"** 然后 **"Save policy"**

## 文件路径格式说明

头像文件按以下格式存储：
```
avatars/{user_id}/{timestamp}.{ext}
```

例如: `avatars/dffd7c4e-a40d-4b85-bb13-e30d732e509c/1706284800000.jpg`

策略中的 `(string_to_array(name, '/'))[2]` 用于提取路径的第二部分（user_id），确保用户只能操作自己的头像。

## 验证设置

### 1. 检查 Bucket 配置

- ✅ Bucket 名称是 `avatars`（区分大小写）
- ✅ Bucket 设置为 Public
- ✅ 文件大小限制为 5MB
- ✅ 允许的 MIME 类型包含 `image/jpeg, image/png, image/webp, image/gif`

### 2. 检查策略配置

在 **Storage** > **avatars** > **Policies** 中确认以下策略存在：

- ✅ `Users can upload own avatar` (INSERT)
- ✅ `Users can update own avatar` (UPDATE)
- ✅ `Users can delete own avatar` (DELETE)
- ✅ `Anyone can view avatars` (SELECT)

### 3. 功能测试

1. **测试上传头像**
   - 登录用户账户
   - 进入个人资料页面
   - 尝试上传头像
   - 应该成功上传

2. **测试查看头像**
   - 上传后，头像应该可以正常显示
   - 公开 URL 应该可以访问

3. **测试删除头像**
   - 尝试删除头像
   - 应该成功删除

## 故障排查

### 问题：上传失败，提示权限错误

**解决方案**：
1. 检查用户是否已登录（`authenticated` 角色）
2. 确认策略中的 `WITH CHECK` 表达式正确
3. 检查文件路径格式是否正确（`avatars/{user_id}/{filename}`）

### 问题：无法访问头像 URL

**解决方案**：
1. 确认 bucket 设置为 Public
2. 检查 SELECT 策略是否正确配置
3. 验证 URL 格式是否正确

### 问题：文件大小超过限制

**解决方案**：
1. 前端已实现图片压缩（最大 800x800）
2. 如果仍超过限制，调整 bucket 的 File size limit
3. 或在前端进一步压缩图片质量

### 问题：SQL 执行报错 "must be owner of table objects"

**原因**：`storage.objects` 是 Supabase 管理的系统表，不能直接通过 SQL 修改。

**解决方案**：**必须通过 Dashboard UI 设置策略**，不能使用 SQL 迁移文件。

## 相关文件

- `src/app/api/users/avatar/route.ts` - 头像上传 API
- `src/components/profile/AvatarUpload.tsx` - 头像上传组件
- `supabase/migrations/005_create_avatars_storage_policies.sql` - SQL 参考（不能直接执行）

## 注意事项

1. ⚠️ **不要尝试通过 SQL 直接修改 `storage.objects` 表的策略**
2. ✅ **所有 Storage 策略必须通过 Dashboard UI 设置**
3. ✅ **策略设置后立即生效，无需重启服务**
4. ✅ **策略可以随时在 Dashboard 中修改或删除**


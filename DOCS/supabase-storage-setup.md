# Supabase Storage 设置指南

## 创建 avatars Bucket

为了支持头像上传功能，需要在 Supabase Dashboard 中创建 Storage bucket。

### 步骤

1. **打开 Supabase Dashboard**
   - 进入你的项目
   - 点击左侧菜单的 "Storage"

2. **创建新 Bucket**
   - 点击 "New bucket"
   - Bucket 名称: `avatars`
   - Public bucket: ✅ 勾选（允许公开访问头像）
   - File size limit: 5MB（或根据需要调整）
   - Allowed MIME types: `image/jpeg,image/png,image/webp,image/gif`

3. **设置 RLS 策略**

   ⚠️ **重要**: Storage 策略必须通过 Dashboard UI 设置，不能直接通过 SQL 修改 `storage.objects` 表。

   **推荐方法：使用 Dashboard UI**

   在 Supabase Dashboard 中按以下步骤操作：

   1. **打开 Storage Policies**
      - 进入 Supabase Dashboard
      - 点击左侧菜单 "Storage"
      - 点击 "avatars" bucket
      - 点击 "Policies" 标签页

   2. **创建策略 1: 允许用户上传自己的头像**
      - 点击 "New Policy"
      - Policy name: `Users can upload own avatar`
      - Allowed operation: `INSERT`
      - Target roles: `authenticated`
      - Policy definition (USING expression): 留空
      - Policy definition (WITH CHECK expression): 输入以下内容：
        ```sql
        bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[2]
        ```
      - 点击 "Review" 然后 "Save policy"

   3. **创建策略 2: 允许用户更新自己的头像**
      - 点击 "New Policy"
      - Policy name: `Users can update own avatar`
      - Allowed operation: `UPDATE`
      - Target roles: `authenticated`
      - Policy definition (USING expression): 输入以下内容：
        ```sql
        bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[2]
        ```
      - Policy definition (WITH CHECK expression): 留空
      - 点击 "Review" 然后 "Save policy"

   4. **创建策略 3: 允许用户删除自己的头像**
      - 点击 "New Policy"
      - Policy name: `Users can delete own avatar`
      - Allowed operation: `DELETE`
      - Target roles: `authenticated`
      - Policy definition (USING expression): 输入以下内容：
        ```sql
        bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[2]
        ```
      - Policy definition (WITH CHECK expression): 留空
      - 点击 "Review" 然后 "Save policy"

   5. **创建策略 4: 允许所有人查看头像（公开访问）**
      - 点击 "New Policy"
      - Policy name: `Anyone can view avatars`
      - Allowed operation: `SELECT`
      - Target roles: `anon, authenticated`（或留空表示所有人）
      - Policy definition (USING expression): 输入以下内容：
        ```sql
        bucket_id = 'avatars'
        ```
      - Policy definition (WITH CHECK expression): 留空
      - 点击 "Review" 然后 "Save policy"

   **备选方法：使用 Supabase MCP（如果已配置）**

   如果你已经配置了 Supabase MCP，可以使用以下命令创建策略（需要先确认 MCP 是否支持 Storage 策略创建）。

4. **验证设置**
   - 尝试上传头像
   - 检查文件是否成功保存
   - 验证公开 URL 是否可以访问

## 文件结构

上传的头像文件将按以下结构存储：

```
avatars/
  └── {user_id}/
      └── {timestamp}.{ext}
```

例如: `avatars/dffd7c4e-a40d-4b85-bb13-e30d732e509c/1706284800000.jpg`

## 故障排查

### 问题：上传失败，提示权限错误

**解决方案**：
1. 检查 RLS 策略是否正确设置
2. 确认 bucket 名称是 `avatars`（区分大小写）
3. 检查用户是否已登录

### 问题：无法访问头像 URL

**解决方案**：
1. 确认 bucket 设置为 Public
2. 检查 RLS 策略中的 SELECT 策略
3. 验证 URL 格式是否正确

### 问题：文件大小超过限制

**解决方案**：
1. 前端已实现图片压缩（最大 800x800）
2. 如果仍超过限制，调整 bucket 的 File size limit
3. 或在前端进一步压缩图片质量

## 相关文件

- `src/app/api/users/avatar/route.ts` - 头像上传 API
- `src/components/profile/AvatarUpload.tsx` - 头像上传组件


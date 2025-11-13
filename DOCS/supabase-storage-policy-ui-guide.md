# Supabase Storage 策略设置 - Dashboard UI 详细指南

## 为什么不能直接用 SQL？

`storage.objects` 是 Supabase 的系统表，受到保护，不能直接通过 SQL 修改。必须通过 Dashboard UI 或 Supabase 提供的 API 来设置策略。

## 详细步骤（带截图说明）

### 步骤 1: 进入 Storage Policies

1. 打开 Supabase Dashboard
2. 点击左侧菜单的 **"Storage"**
3. 找到并点击 **"avatars"** bucket（如果还没有创建，先创建它）
4. 点击 bucket 详情页面的 **"Policies"** 标签页

### 步骤 2: 创建策略 1 - 允许用户上传自己的头像

1. 点击 **"New Policy"** 按钮
2. 填写策略信息：
   - **Policy name**: `Users can upload own avatar`
   - **Allowed operation**: 选择 `INSERT`
   - **Target roles**: 选择 `authenticated`
   - **Policy definition**:
     - **USING expression**: 留空
     - **WITH CHECK expression**: 输入以下内容：
       ```sql
       bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[2]
       ```
3. 点击 **"Review"** 检查策略
4. 点击 **"Save policy"** 保存

### 步骤 3: 创建策略 2 - 允许用户更新自己的头像

1. 点击 **"New Policy"** 按钮
2. 填写策略信息：
   - **Policy name**: `Users can update own avatar`
   - **Allowed operation**: 选择 `UPDATE`
   - **Target roles**: 选择 `authenticated`
   - **Policy definition**:
     - **USING expression**: 输入以下内容：
       ```sql
       bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[2]
       ```
     - **WITH CHECK expression**: 留空
3. 点击 **"Review"** 检查策略
4. 点击 **"Save policy"** 保存

### 步骤 4: 创建策略 3 - 允许用户删除自己的头像

1. 点击 **"New Policy"** 按钮
2. 填写策略信息：
   - **Policy name**: `Users can delete own avatar`
   - **Allowed operation**: 选择 `DELETE`
   - **Target roles**: 选择 `authenticated`
   - **Policy definition**:
     - **USING expression**: 输入以下内容：
       ```sql
       bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[2]
       ```
     - **WITH CHECK expression**: 留空
3. 点击 **"Review"** 检查策略
4. 点击 **"Save policy"** 保存

### 步骤 5: 创建策略 4 - 允许所有人查看头像

1. 点击 **"New Policy"** 按钮
2. 填写策略信息：
   - **Policy name**: `Anyone can view avatars`
   - **Allowed operation**: 选择 `SELECT`
   - **Target roles**: 留空或选择 `anon, authenticated`（表示所有人）
   - **Policy definition**:
     - **USING expression**: 输入以下内容：
       ```sql
       bucket_id = 'avatars'
       ```
     - **WITH CHECK expression**: 留空
3. 点击 **"Review"** 检查策略
4. 点击 **"Save policy"** 保存

## 策略说明

### 路径解析说明

文件路径格式: `avatars/{user_id}/{filename}`

- `string_to_array(name, '/')` 将路径分割成数组
- `[1]` = `"avatars"`
- `[2]` = `"{user_id}"` ← 我们需要验证这个
- `[3]` = `"{filename}"`

### 策略逻辑

1. **INSERT (上传)**: 检查用户 ID 是否匹配路径中的 user_id
2. **UPDATE (更新)**: 检查用户 ID 是否匹配路径中的 user_id
3. **DELETE (删除)**: 检查用户 ID 是否匹配路径中的 user_id
4. **SELECT (查看)**: 允许所有人查看 avatars bucket 中的文件

## 验证策略

设置完成后，你应该看到 4 个策略：

1. ✅ Users can upload own avatar (INSERT)
2. ✅ Users can update own avatar (UPDATE)
3. ✅ Users can delete own avatar (DELETE)
4. ✅ Anyone can view avatars (SELECT)

## 常见问题

### Q: 如果策略创建失败怎么办？

**A**: 检查以下几点：
1. 确认 bucket 名称是 `avatars`（小写，完全匹配）
2. 确认 SQL 表达式语法正确（没有多余的空格或字符）
3. 确认 Target roles 设置正确（INSERT/UPDATE/DELETE 需要 `authenticated`，SELECT 可以留空）

### Q: 如何测试策略是否生效？

**A**: 
1. 登录应用
2. 尝试上传头像
3. 检查 Supabase Dashboard > Storage > avatars 中是否出现文件
4. 检查文件路径格式是否为 `avatars/{user_id}/{filename}`

### Q: 如果路径格式不同怎么办？

**A**: 如果你的文件路径格式不同，需要调整策略中的路径解析：
- 如果路径是 `{user_id}/{filename}`（没有 avatars 前缀），使用 `(string_to_array(name, '/'))[1]`
- 如果路径是 `avatars/{user_id}/{filename}`，使用 `(string_to_array(name, '/'))[2]`

## 相关文件

- `src/app/api/users/avatar/route.ts` - 头像上传 API（生成文件路径）
- `src/components/profile/AvatarUpload.tsx` - 头像上传组件


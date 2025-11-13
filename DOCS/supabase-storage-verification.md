# Supabase Storage 策略验证和测试指南

## 策略验证清单

### ✅ 已创建的策略

在 Supabase Dashboard > Storage > avatars > Policies 中，你应该看到以下 4 个策略：

1. ✅ **Users can upload own avatar** (INSERT)
   - Target roles: `authenticated`
   - WITH CHECK: `bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[2]`

2. ✅ **Users can update own avatar** (UPDATE)
   - Target roles: `authenticated`
   - USING: `bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[2]`

3. ✅ **Users can delete own avatar** (DELETE)
   - Target roles: `authenticated`
   - USING: `bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[2]`

4. ✅ **Anyone can view avatars** (SELECT)
   - Target roles: (空或 `anon, authenticated`)
   - USING: `bucket_id = 'avatars'`

## 功能测试步骤

### 1. 测试头像上传

1. **启动开发服务器**
   ```bash
   npm run dev
   ```

2. **登录应用**
   - 访问 `http://localhost:3000/zh-CN/login`
   - 使用已有账户登录

3. **进入个人资料页面**
   - 访问 `http://localhost:3000/zh-CN/profile`
   - 点击 "编辑" 按钮

4. **上传头像**
   - 点击头像区域或 "选择图片" 按钮
   - 选择一张图片（JPG、PNG、WebP 或 GIF）
   - 点击 "上传" 按钮
   - 等待上传完成

5. **验证上传结果**
   - ✅ 头像应该显示在页面上
   - ✅ 在 Supabase Dashboard > Storage > avatars 中应该能看到文件
   - ✅ 文件路径格式应该是: `avatars/{user_id}/{timestamp}.{ext}`

### 2. 测试头像更新

1. **再次上传新头像**
   - 在编辑模式下，选择另一张图片
   - 点击 "上传"
   - 验证旧头像被新头像替换

2. **验证文件**
   - 在 Supabase Dashboard > Storage > avatars 中
   - 应该看到新的文件，旧文件可能被覆盖（如果使用 upsert）

### 3. 测试头像删除

1. **删除头像**
   - 在编辑模式下，点击 "删除" 按钮
   - 确认删除操作

2. **验证删除**
   - ✅ 头像应该消失，显示默认的首字母头像
   - ✅ 在 Supabase Dashboard > Storage > avatars 中，文件应该被删除

### 4. 测试头像访问

1. **获取头像 URL**
   - 上传头像后，查看浏览器开发者工具 > Network
   - 找到上传请求的响应，获取 `avatarUrl`

2. **验证公开访问**
   - 在新标签页中打开头像 URL（或使用 curl）
   - ✅ 应该能够直接访问头像图片（无需登录）

## 常见问题排查

### 问题 1: 上传失败，提示权限错误

**可能原因**:
- 策略表达式有误
- 用户未登录
- 文件路径格式不匹配

**排查步骤**:
1. 检查用户是否已登录（查看浏览器控制台中的 `auth.uid()`）
2. 检查文件路径格式是否正确（应该是 `avatars/{user_id}/{filename}`）
3. 在 Supabase Dashboard > Logs 中查看详细错误信息

**调试 SQL**:
```sql
-- 检查当前用户 ID
SELECT auth.uid();

-- 检查文件路径解析
SELECT 
  name,
  (string_to_array(name, '/'))[1] as part1,
  (string_to_array(name, '/'))[2] as part2,
  (string_to_array(name, '/'))[3] as part3
FROM storage.objects 
WHERE bucket_id = 'avatars' 
LIMIT 5;
```

### 问题 2: 上传成功但头像不显示

**可能原因**:
- SELECT 策略未正确设置
- Bucket 未设置为 Public
- URL 格式错误

**排查步骤**:
1. 确认 bucket 设置为 Public（在 bucket 设置中）
2. 检查 SELECT 策略是否存在且正确
3. 验证返回的 URL 格式是否正确

### 问题 3: 路径解析错误

**症状**: 上传失败，提示用户 ID 不匹配

**原因**: 文件路径格式与策略中的解析不匹配

**解决方案**:
1. 检查 API 代码中的文件路径格式（`src/app/api/users/avatar/route.ts`）
2. 确认路径格式是 `avatars/{user_id}/{filename}`
3. 如果格式不同，调整策略中的路径解析索引

## 验证 SQL 查询

在 Supabase Dashboard > SQL Editor 中执行以下查询来验证设置：

```sql
-- 1. 检查策略是否存在
SELECT 
  policyname,
  cmd as operation,
  roles,
  qual as using_expression,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%avatar%'
ORDER BY cmd, policyname;

-- 2. 检查 bucket 设置
SELECT 
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE name = 'avatars';

-- 3. 查看已上传的文件（如果有）
SELECT 
  name,
  bucket_id,
  created_at,
  metadata
FROM storage.objects 
WHERE bucket_id = 'avatars'
ORDER BY created_at DESC
LIMIT 10;

-- 4. 测试路径解析
SELECT 
  'avatars/user123/file.jpg' as test_path,
  (string_to_array('avatars/user123/file.jpg', '/'))[1] as part1,
  (string_to_array('avatars/user123/file.jpg', '/'))[2] as part2,
  (string_to_array('avatars/user123/file.jpg', '/'))[3] as part3;
```

## 成功标志

如果一切正常，你应该能够：

1. ✅ 成功上传头像
2. ✅ 在 Storage 中看到文件
3. ✅ 头像在个人资料页面显示
4. ✅ 可以通过公开 URL 访问头像
5. ✅ 可以更新和删除头像

## 下一步

策略设置完成后，可以：
1. 测试头像上传功能
2. 验证头像显示和更新
3. 继续实施其他功能（密码修改、账户设置等）


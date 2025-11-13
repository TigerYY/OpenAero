# Supabase Storage 策略设置故障排查

## 常见错误和解决方案

### 错误 1: `storage.foldername` 函数不存在

**错误信息**:
```
function storage.foldername(text) does not exist
```

**原因**: `storage.foldername()` 不是 Supabase Storage 的标准函数。

**解决方案**: 使用 `string_to_array(name, '/')` 来解析文件路径。

**正确的策略**:
```sql
-- 使用 string_to_array 解析路径
-- 路径格式: avatars/{user_id}/{filename}
-- (string_to_array(name, '/'))[2] 提取 user_id（第二个部分）

CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (string_to_array(name, '/'))[2]
);
```

### 错误 2: 策略创建失败，提示权限不足

**错误信息**:
```
permission denied for table storage.objects
```

**原因**: 需要在 Supabase Dashboard 的 SQL Editor 中执行，而不是通过 API。

**解决方案**:
1. 打开 Supabase Dashboard
2. 进入 SQL Editor
3. 确保使用正确的项目连接
4. 执行策略创建 SQL

### 错误 3: 策略创建成功但上传仍然失败

**可能原因**:
1. Bucket 名称不匹配（区分大小写）
2. 文件路径格式不正确
3. 用户未认证

**检查步骤**:
1. 确认 bucket 名称是 `avatars`（小写）
2. 确认文件路径格式是 `avatars/{user_id}/{filename}`
3. 确认用户已登录（`auth.uid()` 不为 null）

**调试 SQL**:
```sql
-- 检查当前用户 ID
SELECT auth.uid();

-- 检查 bucket 是否存在
SELECT * FROM storage.buckets WHERE name = 'avatars';

-- 检查现有策略
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';
```

### 错误 4: 无法访问头像 URL

**可能原因**:
1. Bucket 未设置为 Public
2. SELECT 策略未正确设置
3. URL 格式错误

**解决方案**:
1. 在 Supabase Dashboard > Storage > avatars bucket 设置中，确保 "Public bucket" 已勾选
2. 确认 SELECT 策略存在：
   ```sql
   CREATE POLICY "Anyone can view avatars"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'avatars');
   ```

### 错误 5: 路径解析错误

**问题**: 如果文件路径格式不是 `avatars/{user_id}/{filename}`，路径解析会失败。

**检查路径格式**:
```sql
-- 查看实际的文件路径格式
SELECT name FROM storage.objects 
WHERE bucket_id = 'avatars' 
LIMIT 5;
```

**根据实际路径调整策略**:
- 如果路径是 `{user_id}/{filename}`（没有 avatars 前缀），使用 `(string_to_array(name, '/'))[1]`
- 如果路径是 `avatars/{user_id}/{filename}`，使用 `(string_to_array(name, '/'))[2]`

## 验证策略设置

执行以下 SQL 验证策略是否正确设置：

```sql
-- 1. 检查 RLS 是否启用
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' 
AND tablename = 'objects';

-- 2. 列出所有策略
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%avatar%';

-- 3. 测试路径解析
SELECT 
  name,
  (string_to_array(name, '/'))[1] as part1,
  (string_to_array(name, '/'))[2] as part2,
  (string_to_array(name, '/'))[3] as part3
FROM storage.objects 
WHERE bucket_id = 'avatars' 
LIMIT 5;
```

## 推荐的完整设置步骤

1. **创建 Bucket**（通过 Dashboard）
   - 名称: `avatars`
   - Public: ✅
   - File size limit: 5MB

2. **执行策略 SQL**（通过 SQL Editor）
   ```sql
   -- 复制 supabase/migrations/005_create_avatars_storage_policies.sql 的内容
   -- 在 SQL Editor 中执行
   ```

3. **验证设置**
   - 尝试上传头像
   - 检查文件是否出现在 Storage 中
   - 验证公开 URL 是否可以访问

4. **如果仍有问题**
   - 检查浏览器控制台的错误信息
   - 检查 Supabase Dashboard > Logs 中的错误
   - 使用上面的调试 SQL 检查策略状态


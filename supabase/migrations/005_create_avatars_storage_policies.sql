-- ============================================
-- 创建 avatars Storage Bucket 的 RLS 策略
-- ============================================

-- ⚠️ 重要提示：
-- Storage 的 RLS 策略不能通过 SQL 直接设置！
-- storage.objects 表是 Supabase 管理的系统表，需要特殊权限。
-- 
-- 必须通过 Supabase Dashboard UI 来设置 Storage 策略：
-- 1. 打开 Supabase Dashboard > Storage > avatars > Policies
-- 2. 按照 DOCS/supabase-storage-policies-setup.md 中的步骤设置策略
--
-- 此 SQL 文件仅作为参考，不能直接执行！

-- 参考策略配置（请通过 Dashboard UI 设置）：

-- 策略 1: 允许用户上传自己的头像 (INSERT)
-- Policy name: "Users can upload own avatar"
-- Allowed operation: INSERT
-- Target roles: authenticated
-- WITH CHECK expression:
--   bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[2]

-- 策略 2: 允许用户更新自己的头像 (UPDATE)
-- Policy name: "Users can update own avatar"
-- Allowed operation: UPDATE
-- Target roles: authenticated
-- USING expression:
--   bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[2]

-- 策略 3: 允许用户删除自己的头像 (DELETE)
-- Policy name: "Users can delete own avatar"
-- Allowed operation: DELETE
-- Target roles: authenticated
-- USING expression:
--   bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[2]

-- 策略 4: 允许所有人查看头像（公开访问）(SELECT)
-- Policy name: "Anyone can view avatars"
-- Allowed operation: SELECT
-- Target roles: anon, authenticated (或留空)
-- USING expression:
--   bucket_id = 'avatars'

-- 详细设置步骤请参考: DOCS/supabase-storage-policies-setup.md

-- 注意：以下 SQL 代码不能执行，仅作为参考！
-- 如果尝试执行，会报错: "must be owner of table objects"

-- 2. 删除已存在的策略（如果存在）
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- 3. 允许用户上传自己的头像
-- 文件路径格式: avatars/{user_id}/{filename}
-- 使用 (string_to_array(name, '/'))[2] 来提取 user_id（路径的第二部分）
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (string_to_array(name, '/'))[2]
);

-- 4. 允许用户更新自己的头像
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (string_to_array(name, '/'))[2]
);

-- 5. 允许用户删除自己的头像
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (string_to_array(name, '/'))[2]
);

-- 6. 允许所有人查看头像（公开访问）
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 添加注释
COMMENT ON POLICY "Users can upload own avatar" ON storage.objects IS '允许认证用户上传自己的头像到 avatars bucket';
COMMENT ON POLICY "Users can update own avatar" ON storage.objects IS '允许认证用户更新自己的头像';
COMMENT ON POLICY "Users can delete own avatar" ON storage.objects IS '允许认证用户删除自己的头像';
COMMENT ON POLICY "Anyone can view avatars" ON storage.objects IS '允许所有人查看 avatars bucket 中的头像（公开访问）';


-- ============================================
-- 创建 avatars Storage Bucket 的 RLS 策略
-- ============================================

-- 注意：此迁移假设你已经通过 Supabase Dashboard 创建了名为 'avatars' 的 bucket
-- 如果 bucket 不存在，请先在 Dashboard 中创建它

-- 1. 确保 storage.objects 表启用了 RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

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


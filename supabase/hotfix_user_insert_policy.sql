-- ============================================
-- 紧急修复：允许用户自注册创建 profile
-- ============================================
-- 问题：用户认证成功但无法创建 user_profiles
-- 原因：缺少 INSERT 策略
-- 日期：2025-11-16
-- ============================================

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON public.user_profiles;

-- 1. 允许用户创建自己的 profile（注册时）
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 2. 允许超级管理员创建任何 profile
CREATE POLICY "Super admins can insert profiles"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() 
      AND 'SUPER_ADMIN' = ANY(roles)
    )
  );

-- ============================================
-- 验证策略
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

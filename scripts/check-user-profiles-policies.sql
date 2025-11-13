-- ============================================
-- 检查 user_profiles 表的 RLS 策略配置
-- 在 Supabase Dashboard > SQL Editor 中执行
-- ============================================

-- 1. 检查 user_profiles 表是否存在且 RLS 已启用
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'user_profiles';

-- 2. 检查所有策略
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_profiles'
ORDER BY cmd, policyname;

-- 3. 检查 is_admin_user 函数是否存在
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'is_admin_user'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 4. 检查策略是否使用 is_admin_user 函数（避免递归）
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual::text LIKE '%is_admin_user%' THEN '✅ 使用函数（正确）'
    WHEN qual::text LIKE '%EXISTS%user_profiles%' THEN '❌ 直接查询表（可能导致递归）'
    ELSE '⚠️  需要检查'
  END as status
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_profiles'
  AND cmd IN ('SELECT', 'UPDATE', 'INSERT', 'DELETE');


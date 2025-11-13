-- ============================================
-- 验证 user_profiles 表的 RLS 策略配置
-- 在 Supabase Dashboard > SQL Editor 中执行
-- ============================================

-- 1. 检查所有策略及其定义
SELECT 
  policyname as "策略名称",
  cmd as "操作",
  qual::text as "USING 条件",
  with_check::text as "WITH CHECK 条件"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_profiles'
ORDER BY cmd, policyname;

-- 2. 检查管理员策略是否使用 is_admin_user() 函数
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual::text LIKE '%is_admin_user%' THEN '✅ 正确：使用 is_admin_user() 函数'
    WHEN qual::text LIKE '%EXISTS%user_profiles%' THEN '❌ 错误：直接查询表，可能导致递归'
    WHEN qual::text LIKE '%EXISTS%' THEN '⚠️  警告：使用 EXISTS，需要检查是否查询 user_profiles'
    ELSE '⚠️  需要检查'
  END as "状态",
  qual::text as "策略定义"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_profiles'
  AND policyname LIKE '%Admin%'
ORDER BY cmd;

-- 3. 检查是否有公开查看策略
SELECT 
  policyname,
  cmd,
  qual::text as "策略定义"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_profiles'
  AND (policyname LIKE '%Public%' OR policyname LIKE '%public%' OR qual::text LIKE '%true%')
ORDER BY cmd;

-- 4. 检查用户插入策略
SELECT 
  policyname,
  cmd,
  with_check::text as "WITH CHECK 条件"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_profiles'
  AND cmd = 'INSERT'
ORDER BY policyname;


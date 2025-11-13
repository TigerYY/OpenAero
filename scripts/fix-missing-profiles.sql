-- =====================================================
-- 修复缺少 profile 的用户
-- 为所有没有 user_profiles 的 auth.users 创建默认记录
-- =====================================================

-- 1. 为所有缺少 profile 的用户创建默认记录
INSERT INTO public.user_profiles (user_id, role, status, created_at, updated_at)
SELECT 
  au.id,
  'USER'::TEXT,
  'ACTIVE'::TEXT,
  NOW(),
  NOW()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.user_profiles up 
  WHERE up.user_id = au.id
)
ON CONFLICT (user_id) DO NOTHING;

-- 2. 验证修复结果
SELECT 
  '修复完成' AS status,
  COUNT(*) AS created_profiles_count
FROM public.user_profiles
WHERE created_at >= NOW() - INTERVAL '1 minute';

-- 3. 再次检查是否还有缺少 profile 的用户
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ 所有用户都有 profile'
    ELSE '✗ 仍有 ' || COUNT(*) || ' 个用户缺少 profile'
  END AS final_status
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles up WHERE up.user_id = au.id
);

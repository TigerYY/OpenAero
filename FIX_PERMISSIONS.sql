-- ============================================
-- 修复 Service Role 权限问题
-- 错误: permission denied for schema public
-- ============================================

-- 1. 授予 service_role 访问 public schema 的权限
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON SCHEMA public TO service_role;

-- 2. 授予 service_role 访问所有表的权限
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 3. 设置未来表的默认权限
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT ALL ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT ALL ON FUNCTIONS TO service_role;

-- 4. 特别授权 user_profiles 表
GRANT ALL ON public.user_profiles TO service_role;
GRANT ALL ON public.creator_profiles TO service_role;

-- 5. 授予 authenticated 角色基本权限
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;

-- 6. 授予 anon 角色基本权限（用于触发器）
GRANT USAGE ON SCHEMA public TO anon;

-- 7. 验证
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ 权限已授予！';
  RAISE NOTICE '';
  RAISE NOTICE '📝 现在重启服务器并测试：';
  RAISE NOTICE '   1. Ctrl+C 停止服务器';
  RAISE NOTICE '   2. npm run dev';
  RAISE NOTICE '   3. 访问 http://localhost:3000/api/users/me';
  RAISE NOTICE '';
END $$;

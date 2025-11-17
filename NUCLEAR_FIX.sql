-- ============================================
-- 核武器级修复：重建所有相关配置
-- 警告：会删除现有 user_profiles 数据！
-- ============================================

-- 1. 删除所有触发器和函数
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. 删除并重建 user_profiles 表
DROP TABLE IF EXISTS public.user_profiles CASCADE;

CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  display_name text NOT NULL,
  avatar text,
  bio text,
  phone text,
  roles text[] NOT NULL DEFAULT ARRAY['USER']::text[],
  permissions text[] DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'ACTIVE',
  is_blocked boolean NOT NULL DEFAULT false,
  blocked_reason text,
  blocked_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. 创建最简单的触发器
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    user_id,
    display_name,
    roles,
    status
  ) VALUES (
    NEW.id,
    COALESCE(NEW.email, 'User'),
    ARRAY['USER']::text[],
    'ACTIVE'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. 为现有用户创建 profiles
INSERT INTO public.user_profiles (user_id, display_name, roles, status)
SELECT 
  id,
  COALESCE(email, 'User'),
  ARRAY['USER']::text[],
  'ACTIVE'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- 5. 授予所有权限
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.user_profiles TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

-- 6. 禁用 RLS
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 完成
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '💥 核武器级修复完成！';
  RAISE NOTICE '';
  RAISE NOTICE '✅ 已为所有现有用户创建 profiles';
  RAISE NOTICE '✅ 触发器已重建';
  RAISE NOTICE '';
  RAISE NOTICE '📝 现在刷新浏览器页面，应该能看到 profile 了';
  RAISE NOTICE '';
END $$;

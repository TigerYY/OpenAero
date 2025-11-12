-- ============================================
-- 用户资料表迁移
-- 基于 Supabase Auth 的用户管理系统
-- ============================================

-- 1. 创建 user_profiles 表
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 个人资料
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  avatar TEXT,
  bio TEXT,
  
  -- 角色与权限
  role TEXT NOT NULL DEFAULT 'USER',
  permissions TEXT[] DEFAULT '{}',
  
  -- 状态管理
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  blocked_reason TEXT,
  blocked_at TIMESTAMPTZ,
  
  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  
  -- 约束
  CONSTRAINT valid_role CHECK (role IN ('USER', 'CREATOR', 'REVIEWER', 'FACTORY_MANAGER', 'ADMIN', 'SUPER_ADMIN')),
  CONSTRAINT valid_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED'))
);

-- 2. 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON public.user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON public.user_profiles(created_at);

-- 3. 创建触发器函数：自动更新 updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 为 user_profiles 表添加 updated_at 触发器
DROP TRIGGER IF EXISTS set_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. 创建触发器函数：当 auth.users 创建时自动创建 user_profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 为 auth.users 添加触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. 启用 Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 8. RLS 策略：公开查看所有用户资料
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.user_profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.user_profiles FOR SELECT
  USING (true);

-- 9. RLS 策略：用户可以更新自己的资料
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- 10. RLS 策略：用户可以插入自己的资料（如果触发器失败）
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 11. RLS 策略：管理员可以管理所有资料
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.user_profiles;
CREATE POLICY "Admins can manage all profiles"
  ON public.user_profiles
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- 12. 创建辅助函数：获取当前用户角色
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.user_profiles WHERE user_id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER;

-- 13. 创建辅助函数：检查用户权限
CREATE OR REPLACE FUNCTION public.has_permission(user_uuid UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
  SELECT 
    CASE 
      WHEN role = 'SUPER_ADMIN' THEN true
      WHEN permission_name = ANY(permissions) THEN true
      ELSE false
    END
  FROM public.user_profiles 
  WHERE user_id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER;

-- 14. 创建辅助函数：检查用户角色
CREATE OR REPLACE FUNCTION public.has_role(user_uuid UUID, role_names TEXT[])
RETURNS BOOLEAN AS $$
  SELECT role = ANY(role_names)
  FROM public.user_profiles 
  WHERE user_id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER;

-- 15. 添加注释
COMMENT ON TABLE public.user_profiles IS '用户资料表 - 扩展 Supabase Auth 用户信息';
COMMENT ON COLUMN public.user_profiles.user_id IS '关联 auth.users.id';
COMMENT ON COLUMN public.user_profiles.role IS '用户角色: USER, CREATOR, REVIEWER, FACTORY_MANAGER, ADMIN, SUPER_ADMIN';
COMMENT ON COLUMN public.user_profiles.status IS '用户状态: ACTIVE, INACTIVE, SUSPENDED, DELETED';
COMMENT ON COLUMN public.user_profiles.permissions IS '额外权限列表';

-- 16. 迁移现有数据（如果存在旧的 users 表）
-- 注意：此部分需要根据实际情况调整
-- DO $$
-- BEGIN
--   IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
--     INSERT INTO public.user_profiles (user_id, first_name, last_name, display_name, avatar, bio, role, permissions, status, created_at, updated_at)
--     SELECT 
--       supabase_id,
--       first_name,
--       last_name,
--       display_name,
--       avatar,
--       bio,
--       role::TEXT,
--       permissions,
--       status::TEXT,
--       created_at,
--       updated_at
--     FROM public.users
--     WHERE supabase_id IS NOT NULL
--     ON CONFLICT (user_id) DO NOTHING;
--   END IF;
-- END $$;

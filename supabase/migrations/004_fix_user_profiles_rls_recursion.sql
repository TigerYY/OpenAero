-- ============================================
-- 修复 user_profiles 表的 RLS 无限递归问题
-- ============================================

-- 问题: "Admins can manage all profiles" 策略在检查管理员权限时
-- 又查询了 user_profiles 表，导致无限递归

-- 解决方案: 创建一个 SECURITY DEFINER 函数来检查用户角色
-- 这样函数执行时会绕过 RLS，避免递归

-- 1. 创建检查用户角色的函数（绕过 RLS）
CREATE OR REPLACE FUNCTION public.is_admin_user(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = user_uuid
    AND role IN ('ADMIN', 'SUPER_ADMIN')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. 删除有问题的策略
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "管理员可以查看所有用户资料" ON public.user_profiles;

-- 3. 重新创建管理员策略（使用函数避免递归）
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
  FOR SELECT
  USING (
    auth.uid() = user_id  -- 用户可以查看自己的
    OR public.is_admin_user(auth.uid())  -- 或管理员可以查看所有
  );

CREATE POLICY "Admins can update all profiles" ON public.user_profiles
  FOR UPDATE
  USING (
    auth.uid() = user_id  -- 用户可以更新自己的
    OR public.is_admin_user(auth.uid())  -- 或管理员可以更新所有
  );

CREATE POLICY "Admins can insert profiles" ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id  -- 用户可以插入自己的
    OR public.is_admin_user(auth.uid())  -- 或管理员可以插入任何
  );

CREATE POLICY "Admins can delete profiles" ON public.user_profiles
  FOR DELETE
  USING (
    public.is_admin_user(auth.uid())  -- 只有管理员可以删除
  );

-- 4. 确保用户自己的策略存在（如果不存在）
DO $$
BEGIN
  -- 检查并创建用户查看自己资料的策略
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles' 
    AND policyname = 'Public profiles are viewable by everyone'
  ) THEN
    CREATE POLICY "Public profiles are viewable by everyone"
      ON public.user_profiles FOR SELECT
      USING (true);
  END IF;

  -- 检查并创建用户更新自己资料的策略
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON public.user_profiles FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  -- 检查并创建用户插入自己资料的策略
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles' 
    AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
      ON public.user_profiles FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 5. 添加注释
COMMENT ON FUNCTION public.is_admin_user(UUID) IS '检查用户是否是管理员（绕过 RLS，避免递归）';


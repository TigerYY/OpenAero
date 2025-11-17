-- ============================================
-- 超级简化修复 SQL
-- 只做 3 件事：
-- 1. 为当前用户创建 profile
-- 2. 创建触发器（以后自动创建）
-- 3. 修复 RLS 策略
-- ============================================

-- 第一步：为现有用户创建 profile
-- ============================================
DO $$ 
DECLARE
  user_count INT;
BEGIN
  -- 为所有缺失 profile 的用户创建记录
  INSERT INTO public.user_profiles (
    id,
    user_id,
    first_name,
    last_name,
    display_name,
    roles,
    permissions,
    status
  )
  SELECT 
    gen_random_uuid(),
    au.id,
    COALESCE(au.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(au.raw_user_meta_data->>'last_name', ''),
    COALESCE(
      au.raw_user_meta_data->>'display_name',
      COALESCE(au.raw_user_meta_data->>'first_name', 'User')
    ),
    ARRAY['USER']::"UserRole"[],
    ARRAY[]::text[],
    'ACTIVE'::"UserStatus"
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.user_id = au.id
  );

  GET DIAGNOSTICS user_count = ROW_COUNT;
  RAISE NOTICE '✅ 为 % 个用户创建了 profile', user_count;
END $$;


-- 第二步：创建自动触发器（以后新用户自动创建）
-- ============================================

-- 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 创建新的触发器函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    user_id,
    first_name,
    last_name,
    display_name,
    roles,
    permissions,
    status
  ) VALUES (
    gen_random_uuid(),
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'User')
    ),
    ARRAY['USER']::"UserRole"[],
    ARRAY[]::text[],
    'ACTIVE'::"UserStatus"
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DO $$ 
BEGIN
  RAISE NOTICE '✅ 触发器创建成功';
END $$;


-- 第三步：修复 RLS 策略
-- ============================================

-- 确保 RLS 启用
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 删除所有旧策略
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.user_profiles;

-- 创建新策略
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert profiles"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (true);

DO $$ 
BEGIN
  RAISE NOTICE '✅ RLS 策略创建成功';
END $$;


-- 第四步：验证配置
-- ============================================
DO $$ 
DECLARE
  auth_users_count INT;
  profiles_count INT;
  trigger_exists BOOLEAN;
BEGIN
  -- 统计
  SELECT COUNT(*) INTO auth_users_count FROM auth.users;
  SELECT COUNT(*) INTO profiles_count FROM public.user_profiles;
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) INTO trigger_exists;

  RAISE NOTICE '';
  RAISE NOTICE '📊 数据库状态:';
  RAISE NOTICE '   - auth.users: % 个用户', auth_users_count;
  RAISE NOTICE '   - user_profiles: % 条记录', profiles_count;
  RAISE NOTICE '   - 触发器存在: %', CASE WHEN trigger_exists THEN '✅ 是' ELSE '❌ 否' END;
  
  IF auth_users_count = profiles_count AND trigger_exists THEN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 完美！数据库配置正确！';
    RAISE NOTICE '📝 现在刷新 profile 页面即可！';
  ELSE
    RAISE WARNING '⚠️  还有问题需要解决';
  END IF;
END $$;

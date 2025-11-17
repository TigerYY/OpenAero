-- ============================================
-- 🎯 最简单的修复方案（数据库为空时使用）
-- ============================================
-- 只需在 Supabase SQL Editor 复制粘贴执行即可
-- ============================================

-- ============================================
-- 第一步：关闭所有业务表的 RLS
-- ============================================

ALTER TABLE solutions DISABLE ROW LEVEL SECURITY;
ALTER TABLE solution_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE solution_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE solution_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_solutions DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_shares DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE factories DISABLE ROW LEVEL SECURITY;
ALTER TABLE sample_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE carts DISABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 第二步：确保 user_profiles 表的 RLS 配置
-- ============================================

-- 确保启用 RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 删除所有旧策略（避免冲突）
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "用户可以查看自己的资料" ON user_profiles;
DROP POLICY IF EXISTS "用户可以更新自己的资料" ON user_profiles;
DROP POLICY IF EXISTS "管理员可以查看所有用户资料" ON user_profiles;

-- 创建简单的策略（只保留必要的）
CREATE POLICY "users_select_own" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_update_own" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 第三步：创建自动创建 profile 的触发器
-- ============================================

-- 删除旧的
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- 创建新的触发器函数
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    user_id,
    display_name,
    roles,
    permissions,
    status,
    is_blocked,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    ),
    ARRAY['USER']::text[],
    ARRAY[]::text[],
    'ACTIVE',
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create user_profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 创建触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 第四步：确保 creator_profiles 表的 RLS 配置
-- ============================================

ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creators_select_own" ON creator_profiles;
DROP POLICY IF EXISTS "creators_update_own" ON creator_profiles;
DROP POLICY IF EXISTS "creators_insert_own" ON creator_profiles;

CREATE POLICY "creators_select_own" ON creator_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "creators_update_own" ON creator_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "creators_insert_own" ON creator_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 完成！验证配置
-- ============================================

-- 显示结果
SELECT '✅ 完成！' AS status;
SELECT 'RLS 配置：2 张表启用，21 张表关闭' AS config;
SELECT '触发器已创建，新用户注册时会自动创建 profile' AS trigger_status;

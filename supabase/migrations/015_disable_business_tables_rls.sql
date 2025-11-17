-- ============================================
-- 🎯 彻底解决 RLS 问题 - 最终方案
-- ============================================
-- 日期: 2025-11-16
-- 目标: 关闭所有业务表的 RLS，只保留 Auth 相关表
--
-- 原因:
--   1. Prisma 使用 postgres 角色，完全绕过 RLS
--   2. 项目架构是 API 主导，不是前端直连数据库
--   3. 22 张表启用了 RLS 但无策略，会导致前端访问失败
--   4. 复杂权限逻辑在应用层实现，RLS 无意义且造成障碍
--   5. Prisma 官方不推荐与 RLS 一起使用
--
-- 策略:
--   ✅ 保留: auth.* 系统表 + user_profiles + creator_profiles
--   ❌ 关闭: 所有其他业务表（22 张）
-- ============================================

-- ============================================
-- PART 1: 关闭所有业务表 RLS
-- ============================================

-- 解决方案相关表 (4 张)
ALTER TABLE public.solutions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.solution_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.solution_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.solution_reviews DISABLE ROW LEVEL SECURITY;

-- 订单相关表 (3 张)
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_solutions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;

-- 支付与收益相关表 (3 张)
ALTER TABLE public.payment_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_shares DISABLE ROW LEVEL SECURITY;

-- 产品相关表 (3 张)
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_inventory DISABLE ROW LEVEL SECURITY;

-- 工厂相关表 (2 张)
ALTER TABLE public.factories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_orders DISABLE ROW LEVEL SECURITY;

-- 评论与收藏相关表 (3 张)
ALTER TABLE public.reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews DISABLE ROW LEVEL SECURITY;

-- 购物车相关表 (2 张)
ALTER TABLE public.carts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items DISABLE ROW LEVEL SECURITY;

-- 通知表 (1 张)
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 2: 删除无用的 RLS 策略（如果有）
-- ============================================

-- 清理 solutions 表可能存在的策略
DROP POLICY IF EXISTS "anyone_view_published_solutions" ON public.solutions;
DROP POLICY IF EXISTS "creators_manage_own_solutions" ON public.solutions;
DROP POLICY IF EXISTS "admins_manage_all_solutions" ON public.solutions;

-- 清理 orders 表可能存在的策略
DROP POLICY IF EXISTS "users_view_own_orders" ON public.orders;
DROP POLICY IF EXISTS "users_manage_own_orders" ON public.orders;
DROP POLICY IF EXISTS "admins_view_all_orders" ON public.orders;

-- 清理 products 表可能存在的策略
DROP POLICY IF EXISTS "anyone_view_published_products" ON public.products;
DROP POLICY IF EXISTS "admins_manage_products" ON public.products;

-- 清理 reviews 表可能存在的策略
DROP POLICY IF EXISTS "users_create_reviews" ON public.reviews;
DROP POLICY IF EXISTS "users_manage_own_reviews" ON public.reviews;
DROP POLICY IF EXISTS "anyone_view_reviews" ON public.reviews;

-- 清理 favorites 表可能存在的策略
DROP POLICY IF EXISTS "users_manage_own_favorites" ON public.favorites;

-- 清理 carts 表可能存在的策略
DROP POLICY IF EXISTS "users_manage_own_cart" ON public.carts;
DROP POLICY IF EXISTS "users_manage_own_cart_items" ON public.cart_items;

-- 清理 notifications 表可能存在的策略
DROP POLICY IF EXISTS "users_view_own_notifications" ON public.notifications;

-- ============================================
-- PART 3: 验证 Auth 相关表的 RLS 保持启用
-- ============================================

-- 确保 user_profiles 和 creator_profiles 保持 RLS 启用
-- （这两张表已经在 014_complete_auth_fix.sql 中配置好）

DO $$
DECLARE
  v_user_profiles_rls BOOLEAN;
  v_creator_profiles_rls BOOLEAN;
BEGIN
  -- 检查 user_profiles RLS 状态
  SELECT relrowsecurity INTO v_user_profiles_rls
  FROM pg_class
  WHERE relname = 'user_profiles';
  
  IF NOT v_user_profiles_rls THEN
    RAISE EXCEPTION 'user_profiles RLS should be enabled!';
  END IF;
  
  -- 检查 creator_profiles RLS 状态
  SELECT relrowsecurity INTO v_creator_profiles_rls
  FROM pg_class
  WHERE relname = 'creator_profiles';
  
  IF NOT v_creator_profiles_rls THEN
    RAISE EXCEPTION 'creator_profiles RLS should be enabled!';
  END IF;
  
  RAISE NOTICE '✅ Auth tables RLS is properly configured';
END;
$$;

-- ============================================
-- PART 4: 验证业务表 RLS 已关闭
-- ============================================

DO $$
DECLARE
  v_rls_enabled_count INTEGER;
  v_table_name TEXT;
BEGIN
  -- 检查业务表的 RLS 状态
  SELECT COUNT(*) INTO v_rls_enabled_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN (
      'solutions', 'solution_versions', 'solution_files', 'solution_reviews',
      'orders', 'order_solutions', 'order_items',
      'payment_transactions', 'payment_events', 'revenue_shares',
      'products', 'product_categories', 'product_inventory',
      'factories', 'sample_orders',
      'reviews', 'favorites', 'product_reviews',
      'carts', 'cart_items',
      'notifications'
    )
    AND c.relrowsecurity = true;
  
  IF v_rls_enabled_count > 0 THEN
    -- 列出仍然启用 RLS 的表
    FOR v_table_name IN
      SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname IN (
          'solutions', 'solution_versions', 'solution_files', 'solution_reviews',
          'orders', 'order_solutions', 'order_items',
          'payment_transactions', 'payment_events', 'revenue_shares',
          'products', 'product_categories', 'product_inventory',
          'factories', 'sample_orders',
          'reviews', 'favorites', 'product_reviews',
          'carts', 'cart_items',
          'notifications'
        )
        AND c.relrowsecurity = true
    LOOP
      RAISE WARNING 'Table % still has RLS enabled!', v_table_name;
    END LOOP;
    
    RAISE EXCEPTION 'Found % business tables with RLS still enabled', v_rls_enabled_count;
  ELSE
    RAISE NOTICE '✅ All business tables have RLS disabled';
  END IF;
END;
$$;

-- ============================================
-- PART 5: 生成报告
-- ============================================

-- 显示最终的 RLS 配置状态
DO $$
DECLARE
  v_total_tables INTEGER;
  v_rls_enabled_tables INTEGER;
  v_rls_disabled_tables INTEGER;
BEGIN
  -- 统计 public schema 的表
  SELECT 
    COUNT(*),
    SUM(CASE WHEN relrowsecurity THEN 1 ELSE 0 END),
    SUM(CASE WHEN NOT relrowsecurity THEN 1 ELSE 0 END)
  INTO v_total_tables, v_rls_enabled_tables, v_rls_disabled_tables
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname NOT LIKE 'pg_%'
    AND c.relname NOT LIKE '_prisma%';
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE '📊 RLS Configuration Summary';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Total tables in public schema: %', v_total_tables;
  RAISE NOTICE 'Tables with RLS enabled: %', v_rls_enabled_tables;
  RAISE NOTICE 'Tables with RLS disabled: %', v_rls_disabled_tables;
  RAISE NOTICE '==========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Expected configuration:';
  RAISE NOTICE '  - RLS enabled: 2 tables (user_profiles, creator_profiles)';
  RAISE NOTICE '  - RLS disabled: 22 tables (all business tables)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Architecture:';
  RAISE NOTICE '  - Auth: Supabase Auth (protected by RLS)';
  RAISE NOTICE '  - Business Data: Prisma + API (protected by application logic)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security Model:';
  RAISE NOTICE '  - Database Level: RLS on auth tables only';
  RAISE NOTICE '  - Application Level: Permission checks in API routes';
  RAISE NOTICE '==========================================';
END;
$$;

-- ============================================
-- PART 6: 显示保留 RLS 的表及其策略
-- ============================================

-- 显示仍然启用 RLS 的表
SELECT 
  schemaname,
  tablename,
  'RLS ENABLED' AS status,
  (
    SELECT COUNT(*)
    FROM pg_policies
    WHERE schemaname = t.schemaname
      AND tablename = t.tablename
  ) AS policy_count
FROM pg_tables t
WHERE schemaname = 'public'
  AND rowsecurity = true
ORDER BY tablename;

-- 显示所有策略详情
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd AS command,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END AS using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK'
    ELSE 'No WITH CHECK'
  END AS with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- 完成！
-- ============================================

COMMENT ON SCHEMA public IS 
'OpenAero Database Schema
Architecture: API-driven with Prisma
Security Model: 
  - Auth tables (user_profiles, creator_profiles): RLS enabled
  - Business tables: RLS disabled, protected by application logic
Last updated: 2025-11-16';

-- 执行后应该看到：
-- ✅ Auth tables RLS is properly configured
-- ✅ All business tables have RLS disabled
-- 📊 RLS Configuration Summary
-- ✅ Expected configuration achieved

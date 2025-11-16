-- ============================================
-- 增强的RLS策略 - 细粒度访问控制
-- ============================================

BEGIN;

-- ============================================
-- 1. User Profiles - 用户档案
-- ============================================

-- 启用RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 删除现有策略（如果存在）
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON user_profiles;

-- 查看自己的档案
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- 更新自己的档案
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid()::text = user_id);

-- 管理员可以查看所有档案
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()::text
      AND ('ADMIN' = ANY(roles) OR 'SUPER_ADMIN' = ANY(roles))
    )
  );

-- 管理员可以更新所有档案
CREATE POLICY "Admins can update all profiles" ON user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()::text
      AND ('ADMIN' = ANY(roles) OR 'SUPER_ADMIN' = ANY(roles))
    )
  );

-- ============================================
-- 2. Creator Profiles - 创作者档案
-- ============================================

ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators can view own profile" ON creator_profiles;
DROP POLICY IF EXISTS "Creators can update own profile" ON creator_profiles;
DROP POLICY IF EXISTS "Anyone can view approved creators" ON creator_profiles;

-- 创作者查看自己的档案
CREATE POLICY "Creators can view own profile" ON creator_profiles
  FOR SELECT
  USING (
    user_id = auth.uid()::text
  );

-- 创作者更新自己的档案
CREATE POLICY "Creators can update own profile" ON creator_profiles
  FOR UPDATE
  USING (
    user_id = auth.uid()::text
  );

-- 任何人可以查看已批准的创作者
CREATE POLICY "Anyone can view approved creators" ON creator_profiles
  FOR SELECT
  USING (status = 'APPROVED');

-- 管理员可以查看所有创作者
CREATE POLICY "Admins can view all creators" ON creator_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()::text
      AND ('ADMIN' = ANY(roles) OR 'SUPER_ADMIN' = ANY(roles))
    )
  );

-- ============================================
-- 3. Solutions - 解决方案
-- ============================================

ALTER TABLE solutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published solutions" ON solutions;
DROP POLICY IF EXISTS "Creators can view own solutions" ON solutions;
DROP POLICY IF EXISTS "Creators can create solutions" ON solutions;
DROP POLICY IF EXISTS "Creators can update own solutions" ON solutions;
DROP POLICY IF EXISTS "Creators can delete own solutions" ON solutions;

-- 任何人可以查看已发布的解决方案
CREATE POLICY "Anyone can view published solutions" ON solutions
  FOR SELECT
  USING (status = 'PUBLISHED');

-- 创作者可以查看自己的所有方案
CREATE POLICY "Creators can view own solutions" ON solutions
  FOR SELECT
  USING (
    creator_id IN (
      SELECT id FROM creator_profiles
      WHERE user_id = auth.uid()::text
    )
  );

-- 创作者可以创建方案
CREATE POLICY "Creators can create solutions" ON solutions
  FOR INSERT
  WITH CHECK (
    creator_id IN (
      SELECT id FROM creator_profiles
      WHERE user_id = auth.uid()::text
      AND status = 'APPROVED'
    )
  );

-- 创作者可以更新自己的方案
CREATE POLICY "Creators can update own solutions" ON solutions
  FOR UPDATE
  USING (
    creator_id IN (
      SELECT id FROM creator_profiles
      WHERE user_id = auth.uid()::text
    )
  );

-- 创作者可以删除自己的草稿方案
CREATE POLICY "Creators can delete own draft solutions" ON solutions
  FOR DELETE
  USING (
    status = 'DRAFT'
    AND creator_id IN (
      SELECT id FROM creator_profiles
      WHERE user_id = auth.uid()::text
    )
  );

-- 管理员可以查看所有方案
CREATE POLICY "Admins can view all solutions" ON solutions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()::text
      AND ('ADMIN' = ANY(roles) OR 'SUPER_ADMIN' = ANY(roles))
    )
  );

-- 管理员可以更新所有方案
CREATE POLICY "Admins can update all solutions" ON solutions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()::text
      AND ('ADMIN' = ANY(roles) OR 'SUPER_ADMIN' = ANY(roles))
    )
  );

-- ============================================
-- 4. Solution Files - 方案文件
-- ============================================

ALTER TABLE solution_files ENABLE ROW LEVEL SECURITY;

-- 任何人可以查看已发布方案的文件
CREATE POLICY "Anyone can view files of published solutions" ON solution_files
  FOR SELECT
  USING (
    solution_id IN (
      SELECT id FROM solutions WHERE status = 'PUBLISHED'
    )
  );

-- 创作者可以查看自己方案的文件
CREATE POLICY "Creators can view own solution files" ON solution_files
  FOR SELECT
  USING (
    solution_id IN (
      SELECT s.id FROM solutions s
      JOIN creator_profiles cp ON s.creator_id = cp.id
      WHERE cp.user_id = auth.uid()::text
    )
  );

-- 创作者可以上传文件到自己的方案
CREATE POLICY "Creators can upload files to own solutions" ON solution_files
  FOR INSERT
  WITH CHECK (
    solution_id IN (
      SELECT s.id FROM solutions s
      JOIN creator_profiles cp ON s.creator_id = cp.id
      WHERE cp.user_id = auth.uid()::text
    )
  );

-- ============================================
-- 5. Orders - 订单
-- ============================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 用户可以查看自己的订单
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT
  USING (user_id = auth.uid()::text);

-- 用户可以创建订单
CREATE POLICY "Users can create orders" ON orders
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

-- 管理员可以查看所有订单
CREATE POLICY "Admins can view all orders" ON orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()::text
      AND ('ADMIN' = ANY(roles) OR 'SUPER_ADMIN' = ANY(roles))
    )
  );

-- ============================================
-- 6. Reviews - 评论
-- ============================================

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 任何人可以查看评论
CREATE POLICY "Anyone can view reviews" ON reviews
  FOR SELECT
  USING (true);

-- 用户可以创建评论
CREATE POLICY "Users can create reviews" ON reviews
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

-- 用户可以更新自己的评论
CREATE POLICY "Users can update own reviews" ON reviews
  FOR UPDATE
  USING (user_id = auth.uid()::text);

-- 用户可以删除自己的评论
CREATE POLICY "Users can delete own reviews" ON reviews
  FOR DELETE
  USING (user_id = auth.uid()::text);

-- ============================================
-- 7. Favorites - 收藏
-- ============================================

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- 用户可以查看自己的收藏
CREATE POLICY "Users can view own favorites" ON favorites
  FOR SELECT
  USING (user_id = auth.uid()::text);

-- 用户可以添加收藏
CREATE POLICY "Users can add favorites" ON favorites
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

-- 用户可以删除自己的收藏
CREATE POLICY "Users can delete own favorites" ON favorites
  FOR DELETE
  USING (user_id = auth.uid()::text);

-- ============================================
-- 8. Notifications - 通知
-- ============================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 用户可以查看自己的通知
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT
  USING (user_id = auth.uid()::text);

-- 用户可以更新自己的通知（标记已读）
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE
  USING (user_id = auth.uid()::text);

-- 系统可以创建通知（由后端触发器或函数完成）
CREATE POLICY "Service role can create notifications" ON notifications
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 9. Products - 产品
-- ============================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 任何人可以查看活跃的产品
CREATE POLICY "Anyone can view active products" ON products
  FOR SELECT
  USING (is_active = true AND status = 'PUBLISHED');

-- 管理员可以查看所有产品
CREATE POLICY "Admins can view all products" ON products
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()::text
      AND ('ADMIN' = ANY(roles) OR 'SUPER_ADMIN' = ANY(roles))
    )
  );

-- 管理员可以管理产品
CREATE POLICY "Admins can manage products" ON products
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()::text
      AND ('ADMIN' = ANY(roles) OR 'SUPER_ADMIN' = ANY(roles))
    )
  );

-- ============================================
-- 10. Carts - 购物车
-- ============================================

ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

-- 用户可以查看自己的购物车
CREATE POLICY "Users can view own cart" ON carts
  FOR SELECT
  USING (user_id = auth.uid()::text);

-- 用户可以管理自己的购物车
CREATE POLICY "Users can manage own cart" ON carts
  FOR ALL
  USING (user_id = auth.uid()::text);

-- ============================================
-- 11. Cart Items - 购物车明细
-- ============================================

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- 用户可以查看自己购物车的商品
CREATE POLICY "Users can view own cart items" ON cart_items
  FOR SELECT
  USING (
    cart_id IN (
      SELECT id FROM carts WHERE user_id = auth.uid()::text
    )
  );

-- 用户可以管理自己购物车的商品
CREATE POLICY "Users can manage own cart items" ON cart_items
  FOR ALL
  USING (
    cart_id IN (
      SELECT id FROM carts WHERE user_id = auth.uid()::text
    )
  );

COMMIT;

-- 验证RLS策略
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT 'Enhanced RLS policies created successfully!' AS status;

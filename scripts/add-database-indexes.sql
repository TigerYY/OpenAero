-- ============================================
-- 数据库性能优化 - 添加索引
-- ============================================

BEGIN;

-- ============================================
-- 1. User Profiles 索引
-- ============================================

-- user_id是主要查询字段（已有unique约束，自动创建索引）
-- 添加角色查询索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_roles 
  ON user_profiles USING GIN (roles);

-- 添加状态查询索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_status 
  ON user_profiles (status);

-- 添加最后登录时间索引（用于活跃用户统计）
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login 
  ON user_profiles (last_login_at DESC NULLS LAST);

-- 添加创建时间索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at 
  ON user_profiles (created_at DESC);

-- ============================================
-- 2. Creator Profiles 索引
-- ============================================

-- user_id已有unique约束
-- 添加状态索引
CREATE INDEX IF NOT EXISTS idx_creator_profiles_status 
  ON creator_profiles (status);

-- 添加收益排序索引
CREATE INDEX IF NOT EXISTS idx_creator_profiles_revenue 
  ON creator_profiles (revenue DESC);

-- 添加专长搜索索引
CREATE INDEX IF NOT EXISTS idx_creator_profiles_specialties 
  ON creator_profiles USING GIN (specialties);

-- ============================================
-- 3. Solutions 索引（核心表，需重点优化）
-- ============================================

-- 创作者ID索引（高频查询）
CREATE INDEX IF NOT EXISTS idx_solutions_creator_id 
  ON solutions (creator_id);

-- 状态索引（公开查询最常用）
CREATE INDEX IF NOT EXISTS idx_solutions_status 
  ON solutions (status);

-- 分类索引
CREATE INDEX IF NOT EXISTS idx_solutions_category 
  ON solutions (category);

-- 复合索引：状态+分类（常见组合查询）
CREATE INDEX IF NOT EXISTS idx_solutions_status_category 
  ON solutions (status, category);

-- 价格范围查询索引
CREATE INDEX IF NOT EXISTS idx_solutions_price 
  ON solutions (price);

-- 创建时间索引（排序常用）
CREATE INDEX IF NOT EXISTS idx_solutions_created_at 
  ON solutions (created_at DESC);

-- 更新时间索引
CREATE INDEX IF NOT EXISTS idx_solutions_updated_at 
  ON solutions (updated_at DESC);

-- 发布时间索引
CREATE INDEX IF NOT EXISTS idx_solutions_published_at 
  ON solutions (published_at DESC NULLS LAST);

-- 复合索引：状态+创建时间（列表页常用）
CREATE INDEX IF NOT EXISTS idx_solutions_status_created 
  ON solutions (status, created_at DESC);

-- 标签搜索索引
CREATE INDEX IF NOT EXISTS idx_solutions_tags 
  ON solutions USING GIN (tags);

-- 特性搜索索引
CREATE INDEX IF NOT EXISTS idx_solutions_features 
  ON solutions USING GIN (features);

-- 全文搜索索引（标题+描述）
CREATE INDEX IF NOT EXISTS idx_solutions_title_search 
  ON solutions USING GIN (to_tsvector('english', title));

CREATE INDEX IF NOT EXISTS idx_solutions_description_search 
  ON solutions USING GIN (to_tsvector('english', description));

-- ============================================
-- 4. Solution Files 索引
-- ============================================

-- 方案ID索引
CREATE INDEX IF NOT EXISTS idx_solution_files_solution_id 
  ON solution_files (solution_id);

-- 文件类型索引
CREATE INDEX IF NOT EXISTS idx_solution_files_file_type 
  ON solution_files (file_type);

-- 状态索引
CREATE INDEX IF NOT EXISTS idx_solution_files_status 
  ON solution_files (status);

-- 上传者索引
CREATE INDEX IF NOT EXISTS idx_solution_files_uploaded_by 
  ON solution_files (uploaded_by);

-- 复合索引：方案+状态
CREATE INDEX IF NOT EXISTS idx_solution_files_solution_status 
  ON solution_files (solution_id, status);

-- ============================================
-- 5. Solution Reviews 索引
-- ============================================

-- 方案ID索引
CREATE INDEX IF NOT EXISTS idx_solution_reviews_solution_id 
  ON solution_reviews (solution_id);

-- 审核员索引
CREATE INDEX IF NOT EXISTS idx_solution_reviews_reviewer_id 
  ON solution_reviews (reviewer_id);

-- 状态索引
CREATE INDEX IF NOT EXISTS idx_solution_reviews_status 
  ON solution_reviews (status);

-- 决策索引
CREATE INDEX IF NOT EXISTS idx_solution_reviews_decision 
  ON solution_reviews (decision);

-- 复合索引：方案+状态
CREATE INDEX IF NOT EXISTS idx_solution_reviews_solution_status 
  ON solution_reviews (solution_id, status);

-- ============================================
-- 6. Orders 索引
-- ============================================

-- 用户ID索引
CREATE INDEX IF NOT EXISTS idx_orders_user_id 
  ON orders (user_id);

-- 状态索引
CREATE INDEX IF NOT EXISTS idx_orders_status 
  ON orders (status);

-- 订单号索引（已有unique约束）
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number 
--   ON orders (order_number);

-- 创建时间索引
CREATE INDEX IF NOT EXISTS idx_orders_created_at 
  ON orders (created_at DESC);

-- 复合索引：用户+状态
CREATE INDEX IF NOT EXISTS idx_orders_user_status 
  ON orders (user_id, status);

-- 复合索引：用户+创建时间
CREATE INDEX IF NOT EXISTS idx_orders_user_created 
  ON orders (user_id, created_at DESC);

-- ============================================
-- 7. Order Solutions 索引
-- ============================================

-- 订单ID索引
CREATE INDEX IF NOT EXISTS idx_order_solutions_order_id 
  ON order_solutions (order_id);

-- 方案ID索引
CREATE INDEX IF NOT EXISTS idx_order_solutions_solution_id 
  ON order_solutions (solution_id);

-- ============================================
-- 8. Payment Transactions 索引
-- ============================================

-- 订单ID索引
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id 
  ON payment_transactions (order_id);

-- 状态索引
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status 
  ON payment_transactions (status);

-- 支付方式索引
CREATE INDEX IF NOT EXISTS idx_payment_transactions_method 
  ON payment_transactions (payment_method);

-- 外部ID索引
CREATE INDEX IF NOT EXISTS idx_payment_transactions_external_id 
  ON payment_transactions (external_id);

-- 支付时间索引
CREATE INDEX IF NOT EXISTS idx_payment_transactions_paid_at 
  ON payment_transactions (paid_at DESC NULLS LAST);

-- 复合索引：订单+状态
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_status 
  ON payment_transactions (order_id, status);

-- ============================================
-- 9. Revenue Shares 索引
-- ============================================

-- 创作者ID索引
CREATE INDEX IF NOT EXISTS idx_revenue_shares_creator_id 
  ON revenue_shares (creator_id);

-- 方案ID索引
CREATE INDEX IF NOT EXISTS idx_revenue_shares_solution_id 
  ON revenue_shares (solution_id);

-- 订单ID索引
CREATE INDEX IF NOT EXISTS idx_revenue_shares_order_id 
  ON revenue_shares (order_id);

-- 状态索引
CREATE INDEX IF NOT EXISTS idx_revenue_shares_status 
  ON revenue_shares (status);

-- 结算时间索引
CREATE INDEX IF NOT EXISTS idx_revenue_shares_settled_at 
  ON revenue_shares (settled_at DESC NULLS LAST);

-- 复合索引：创作者+状态
CREATE INDEX IF NOT EXISTS idx_revenue_shares_creator_status 
  ON revenue_shares (creator_id, status);

-- ============================================
-- 10. Reviews 索引
-- ============================================

-- 用户ID索引
CREATE INDEX IF NOT EXISTS idx_reviews_user_id 
  ON reviews (user_id);

-- 方案ID索引
CREATE INDEX IF NOT EXISTS idx_reviews_solution_id 
  ON reviews (solution_id);

-- 评分索引（用于排序和统计）
CREATE INDEX IF NOT EXISTS idx_reviews_rating 
  ON reviews (rating);

-- 创建时间索引
CREATE INDEX IF NOT EXISTS idx_reviews_created_at 
  ON reviews (created_at DESC);

-- 复合索引：方案+创建时间
CREATE INDEX IF NOT EXISTS idx_reviews_solution_created 
  ON reviews (solution_id, created_at DESC);

-- ============================================
-- 11. Favorites 索引
-- ============================================

-- 用户ID索引
CREATE INDEX IF NOT EXISTS idx_favorites_user_id 
  ON favorites (user_id);

-- 方案ID索引
CREATE INDEX IF NOT EXISTS idx_favorites_solution_id 
  ON favorites (solution_id);

-- 创建时间索引
CREATE INDEX IF NOT EXISTS idx_favorites_created_at 
  ON favorites (created_at DESC);

-- ============================================
-- 12. Products 索引
-- ============================================

-- SKU索引（已有unique约束）
-- 分类ID索引
CREATE INDEX IF NOT EXISTS idx_products_category_id 
  ON products (category_id);

-- 方案ID索引
CREATE INDEX IF NOT EXISTS idx_products_solution_id 
  ON products (solution_id);

-- 状态索引
CREATE INDEX IF NOT EXISTS idx_products_status 
  ON products (status);

-- 活跃状态索引
CREATE INDEX IF NOT EXISTS idx_products_is_active 
  ON products (is_active);

-- 特色产品索引
CREATE INDEX IF NOT EXISTS idx_products_is_featured 
  ON products (is_featured);

-- 价格索引
CREATE INDEX IF NOT EXISTS idx_products_price 
  ON products (price);

-- 评分索引
CREATE INDEX IF NOT EXISTS idx_products_rating 
  ON products (rating DESC NULLS LAST);

-- 销量索引
CREATE INDEX IF NOT EXISTS idx_products_sales_count 
  ON products (sales_count DESC);

-- 浏览量索引
CREATE INDEX IF NOT EXISTS idx_products_view_count 
  ON products (view_count DESC);

-- 复合索引：分类+活跃+状态
CREATE INDEX IF NOT EXISTS idx_products_category_active_status 
  ON products (category_id, is_active, status);

-- 全文搜索索引
CREATE INDEX IF NOT EXISTS idx_products_name_search 
  ON products USING GIN (to_tsvector('english', name));

-- ============================================
-- 13. Notifications 索引
-- ============================================

-- 用户ID索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
  ON notifications (user_id);

-- 类型索引
CREATE INDEX IF NOT EXISTS idx_notifications_type 
  ON notifications (type);

-- 已读状态索引
CREATE INDEX IF NOT EXISTS idx_notifications_read 
  ON notifications (read);

-- 优先级索引
CREATE INDEX IF NOT EXISTS idx_notifications_priority 
  ON notifications (priority);

-- 创建时间索引
CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
  ON notifications (created_at DESC);

-- 复合索引：用户+已读+创建时间
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
  ON notifications (user_id, read, created_at DESC);

-- ============================================
-- 14. Carts & Cart Items 索引
-- ============================================

-- 购物车用户索引（已有unique约束）
CREATE INDEX IF NOT EXISTS idx_carts_status 
  ON carts (status);

-- 购物车明细
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id 
  ON cart_items (cart_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_product_id 
  ON cart_items (product_id);

COMMIT;

-- ============================================
-- 索引使用情况查询（用于后续监控）
-- ============================================

-- 查看所有索引
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 统计每个表的索引数量
SELECT 
  tablename,
  COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY index_count DESC, tablename;

SELECT 'Database indexes created successfully!' AS status;

-- ============================================
-- 优化的常用查询 - 提供高性能查询模板
-- ============================================

-- ============================================
-- 1. Solutions 常用查询优化
-- ============================================

-- 1.1 获取已发布的解决方案列表（带分页）
-- 优化：使用索引 idx_solutions_status_created
CREATE OR REPLACE FUNCTION get_published_solutions(
  page_num INT DEFAULT 1,
  page_size INT DEFAULT 10,
  filter_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id TEXT,
  title TEXT,
  description TEXT,
  category TEXT,
  price NUMERIC,
  images TEXT[],
  creator_name TEXT,
  created_at TIMESTAMP,
  review_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.title,
    s.description,
    s.category,
    s.price,
    s.images,
    COALESCE(up.display_name, up.first_name || ' ' || up.last_name, 'Unknown') as creator_name,
    s.created_at,
    COUNT(r.id) as review_count
  FROM solutions s
  LEFT JOIN creator_profiles cp ON s.creator_id = cp.id
  LEFT JOIN user_profiles up ON cp.user_id = up.user_id
  LEFT JOIN reviews r ON s.id = r.solution_id
  WHERE s.status = 'PUBLISHED'
    AND (filter_category IS NULL OR s.category = filter_category)
  GROUP BY s.id, s.title, s.description, s.category, s.price, s.images, 
           up.display_name, up.first_name, up.last_name, s.created_at
  ORDER BY s.created_at DESC
  LIMIT page_size
  OFFSET (page_num - 1) * page_size;
END;
$$ LANGUAGE plpgsql;

-- 1.2 获取热门解决方案（按销量或收藏数）
CREATE OR REPLACE FUNCTION get_popular_solutions(
  limit_count INT DEFAULT 10
)
RETURNS TABLE (
  id TEXT,
  title TEXT,
  price NUMERIC,
  images TEXT[],
  favorite_count BIGINT,
  order_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.title,
    s.price,
    s.images,
    COUNT(DISTINCT f.id) as favorite_count,
    COUNT(DISTINCT os.id) as order_count
  FROM solutions s
  LEFT JOIN favorites f ON s.id = f.solution_id
  LEFT JOIN order_solutions os ON s.id = os.solution_id
  WHERE s.status = 'PUBLISHED'
  GROUP BY s.id, s.title, s.price, s.images
  ORDER BY (COUNT(DISTINCT f.id) + COUNT(DISTINCT os.id) * 2) DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 1.3 获取创作者的解决方案统计
CREATE OR REPLACE FUNCTION get_creator_solution_stats(
  p_creator_id TEXT
)
RETURNS TABLE (
  total_solutions BIGINT,
  published_solutions BIGINT,
  draft_solutions BIGINT,
  pending_solutions BIGINT,
  total_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_solutions,
    COUNT(*) FILTER (WHERE status = 'PUBLISHED') as published_solutions,
    COUNT(*) FILTER (WHERE status = 'DRAFT') as draft_solutions,
    COUNT(*) FILTER (WHERE status = 'PENDING_REVIEW') as pending_solutions,
    COALESCE(SUM(rs.creator_revenue), 0) as total_revenue
  FROM solutions s
  LEFT JOIN revenue_shares rs ON s.id = rs.solution_id
  WHERE s.creator_id = p_creator_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. User & Creator 查询优化
-- ============================================

-- 2.1 获取活跃创作者列表
CREATE OR REPLACE FUNCTION get_active_creators(
  limit_count INT DEFAULT 10
)
RETURNS TABLE (
  creator_id TEXT,
  user_name TEXT,
  bio TEXT,
  specialties TEXT[],
  solution_count BIGINT,
  total_revenue NUMERIC,
  average_rating NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id as creator_id,
    COALESCE(up.display_name, up.first_name || ' ' || up.last_name) as user_name,
    cp.bio,
    cp.specialties,
    COUNT(DISTINCT s.id) as solution_count,
    cp.revenue as total_revenue,
    AVG(r.rating) as average_rating
  FROM creator_profiles cp
  JOIN user_profiles up ON cp.user_id = up.user_id
  LEFT JOIN solutions s ON cp.id = s.creator_id AND s.status = 'PUBLISHED'
  LEFT JOIN reviews r ON s.id = r.solution_id
  WHERE cp.status = 'APPROVED'
  GROUP BY cp.id, up.display_name, up.first_name, up.last_name, cp.bio, cp.specialties, cp.revenue
  HAVING COUNT(DISTINCT s.id) > 0
  ORDER BY COUNT(DISTINCT s.id) DESC, cp.revenue DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. Order 查询优化
-- ============================================

-- 3.1 获取用户订单历史（带详情）
CREATE OR REPLACE FUNCTION get_user_orders(
  p_user_id TEXT,
  page_num INT DEFAULT 1,
  page_size INT DEFAULT 10
)
RETURNS TABLE (
  order_id TEXT,
  order_number TEXT,
  status TEXT,
  total NUMERIC,
  created_at TIMESTAMP,
  solution_count BIGINT,
  payment_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id as order_id,
    o.order_number,
    o.status::TEXT,
    o.total,
    o.created_at,
    COUNT(DISTINCT os.solution_id) as solution_count,
    COALESCE(pt.status::TEXT, 'PENDING') as payment_status
  FROM orders o
  LEFT JOIN order_solutions os ON o.id = os.order_id
  LEFT JOIN payment_transactions pt ON o.id = pt.order_id
  WHERE o.user_id = p_user_id
  GROUP BY o.id, o.order_number, o.status, o.total, o.created_at, pt.status
  ORDER BY o.created_at DESC
  LIMIT page_size
  OFFSET (page_num - 1) * page_size;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. Analytics 查询优化
-- ============================================

-- 4.1 获取系统统计数据（管理员仪表板）
CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS TABLE (
  total_users BIGINT,
  total_creators BIGINT,
  total_solutions BIGINT,
  published_solutions BIGINT,
  total_orders BIGINT,
  total_revenue NUMERIC,
  active_users_30d BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM user_profiles) as total_users,
    (SELECT COUNT(*) FROM creator_profiles WHERE status = 'APPROVED') as total_creators,
    (SELECT COUNT(*) FROM solutions) as total_solutions,
    (SELECT COUNT(*) FROM solutions WHERE status = 'PUBLISHED') as published_solutions,
    (SELECT COUNT(*) FROM orders) as total_orders,
    (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status IN ('COMPLETED', 'DELIVERED')) as total_revenue,
    (SELECT COUNT(*) FROM user_profiles WHERE last_login_at > NOW() - INTERVAL '30 days') as active_users_30d;
END;
$$ LANGUAGE plpgsql;

-- 4.2 获取分类统计
CREATE OR REPLACE FUNCTION get_category_stats()
RETURNS TABLE (
  category TEXT,
  solution_count BIGINT,
  total_sales BIGINT,
  average_price NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.category,
    COUNT(DISTINCT s.id) as solution_count,
    COUNT(DISTINCT os.order_id) as total_sales,
    AVG(s.price) as average_price
  FROM solutions s
  LEFT JOIN order_solutions os ON s.id = os.solution_id
  WHERE s.status = 'PUBLISHED'
  GROUP BY s.category
  ORDER BY COUNT(DISTINCT s.id) DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. Search 查询优化
-- ============================================

-- 5.1 全文搜索解决方案
CREATE OR REPLACE FUNCTION search_solutions(
  search_term TEXT,
  limit_count INT DEFAULT 20
)
RETURNS TABLE (
  id TEXT,
  title TEXT,
  description TEXT,
  category TEXT,
  price NUMERIC,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.title,
    s.description,
    s.category,
    s.price,
    ts_rank(
      to_tsvector('english', s.title || ' ' || s.description),
      plainto_tsquery('english', search_term)
    ) as relevance
  FROM solutions s
  WHERE s.status = 'PUBLISHED'
    AND (
      to_tsvector('english', s.title || ' ' || s.description) @@ plainto_tsquery('english', search_term)
      OR s.title ILIKE '%' || search_term || '%'
      OR s.description ILIKE '%' || search_term || '%'
    )
  ORDER BY relevance DESC, s.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. 物化视图（Materialized Views）用于复杂统计
-- ============================================

-- 6.1 创作者统计物化视图
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_creator_stats AS
SELECT 
  cp.id as creator_id,
  cp.user_id,
  COUNT(DISTINCT s.id) as solution_count,
  COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'PUBLISHED') as published_count,
  COUNT(DISTINCT os.order_id) as total_sales,
  COALESCE(SUM(rs.creator_revenue), 0) as total_revenue,
  COALESCE(AVG(r.rating), 0) as average_rating,
  COUNT(DISTINCT r.id) as review_count
FROM creator_profiles cp
LEFT JOIN solutions s ON cp.id = s.creator_id
LEFT JOIN order_solutions os ON s.id = os.solution_id
LEFT JOIN revenue_shares rs ON cp.id = rs.creator_id
LEFT JOIN reviews r ON s.id = r.solution_id
GROUP BY cp.id, cp.user_id;

-- 创建唯一索引以支持REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_creator_stats_creator_id 
  ON mv_creator_stats (creator_id);

-- 6.2 解决方案统计物化视图
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_solution_stats AS
SELECT 
  s.id as solution_id,
  s.title,
  s.category,
  s.status,
  s.price,
  COUNT(DISTINCT f.id) as favorite_count,
  COUNT(DISTINCT r.id) as review_count,
  COALESCE(AVG(r.rating), 0) as average_rating,
  COUNT(DISTINCT os.order_id) as order_count,
  s.created_at,
  s.published_at
FROM solutions s
LEFT JOIN favorites f ON s.id = f.solution_id
LEFT JOIN reviews r ON s.id = r.solution_id
LEFT JOIN order_solutions os ON s.id = os.solution_id
GROUP BY s.id, s.title, s.category, s.status, s.price, s.created_at, s.published_at;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_solution_stats_solution_id 
  ON mv_solution_stats (solution_id);

-- ============================================
-- 7. 刷新物化视图的函数（定时任务调用）
-- ============================================

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_creator_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_solution_stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. 查询示例和使用说明
-- ============================================

-- 使用示例：

-- 8.1 获取第1页的已发布解决方案
-- SELECT * FROM get_published_solutions(1, 10);

-- 8.2 获取electronics分类的解决方案
-- SELECT * FROM get_published_solutions(1, 10, 'electronics');

-- 8.3 获取热门解决方案
-- SELECT * FROM get_popular_solutions(10);

-- 8.4 搜索解决方案
-- SELECT * FROM search_solutions('robot arm', 20);

-- 8.5 获取系统统计
-- SELECT * FROM get_system_stats();

-- 8.6 刷新物化视图（建议每小时执行一次）
-- SELECT refresh_materialized_views();

SELECT 'Optimized queries and functions created successfully!' AS status;

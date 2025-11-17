# 管理员仪表板性能优化文档

## 概述

本文档描述了管理员仪表板的性能优化措施，包括API缓存、数据库查询优化和前端性能优化。

## 1. API响应缓存

### 缓存策略

- **统计数据缓存**: 5分钟TTL
- **图表数据缓存**: 10分钟TTL
- **活动流缓存**: 30秒TTL（仅第一页）
- **预警数据缓存**: 1分钟TTL

### 缓存实现

使用内存缓存（MemoryCache）实现，支持LRU策略。

### 缓存清除

在以下操作后自动清除相关缓存：
- 批量批准/拒绝方案
- 方案状态变更
- 用户状态变更

## 2. 数据库查询优化

### 建议的索引

#### Solution表索引

```sql
-- 状态索引（用于待审核方案查询）
CREATE INDEX idx_solution_status ON "Solution"(status);

-- 创建时间索引（用于趋势分析）
CREATE INDEX idx_solution_created_at ON "Solution"(created_at);

-- 提交时间索引（用于审核时间计算）
CREATE INDEX idx_solution_submitted_at ON "Solution"(submitted_at) WHERE submitted_at IS NOT NULL;

-- 分类索引（用于分类分布查询）
CREATE INDEX idx_solution_category ON "Solution"(category_id);

-- 复合索引（状态+创建时间，用于待审核方案列表）
CREATE INDEX idx_solution_status_created ON "Solution"(status, created_at);
```

#### SolutionReview表索引

```sql
-- 审核时间索引（用于审核时间计算）
CREATE INDEX idx_solution_review_reviewed_at ON "SolutionReview"(reviewed_at) WHERE reviewed_at IS NOT NULL;

-- 方案ID索引（用于关联查询）
CREATE INDEX idx_solution_review_solution_id ON "SolutionReview"(solution_id);

-- 审核者ID索引
CREATE INDEX idx_solution_review_reviewer_id ON "SolutionReview"(reviewer_id);

-- 复合索引（方案ID+审核时间）
CREATE INDEX idx_solution_review_solution_reviewed ON "SolutionReview"(solution_id, reviewed_at);
```

#### UserProfile表索引

```sql
-- 角色索引（用于角色筛选）
CREATE INDEX idx_user_profile_roles ON "UserProfile" USING GIN(roles);

-- 创建时间索引（用于用户增长趋势）
CREATE INDEX idx_user_profile_created_at ON "UserProfile"(created_at);

-- 状态索引（用于状态筛选）
CREATE INDEX idx_user_profile_status ON "UserProfile"(status);
```

#### Order表索引

```sql
-- 创建时间索引（用于收入趋势）
CREATE INDEX idx_order_created_at ON "Order"(created_at);

-- 状态索引
CREATE INDEX idx_order_status ON "Order"(status);

-- 用户ID索引
CREATE INDEX idx_order_user_id ON "Order"(user_id);

-- 复合索引（创建时间+状态，用于收入统计）
CREATE INDEX idx_order_created_status ON "Order"(created_at, status);
```

### 查询优化建议

1. **使用并行查询**: 对于独立的统计数据，使用`Promise.all`并行执行
2. **限制查询范围**: 使用时间范围参数限制查询的数据量
3. **使用聚合查询**: 尽量在数据库层面完成聚合，减少数据传输
4. **避免N+1查询**: 使用`include`或`select`一次性获取关联数据

## 3. 前端性能优化

### 图表懒加载

使用React Suspense包装图表组件，实现懒加载：

```tsx
<Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
  <ResponsiveContainer>
    <LineChart data={data} />
  </ResponsiveContainer>
</Suspense>
```

### 虚拟滚动

对于大量活动数据，使用虚拟滚动组件`VirtualizedActivityFeed`：

- 只渲染可见区域的活动项
- 支持自定义项目高度
- 支持overscan优化滚动体验

### 防抖和节流

使用自定义Hooks优化用户交互：

- `useDebounce`: 用于搜索输入等场景
- `useThrottle`: 用于滚动、窗口调整等场景

### 自动刷新优化

- 使用节流限制刷新频率
- 支持手动刷新
- 显示最后刷新时间

## 4. 性能监控

### 缓存命中率

通过响应头`X-Cache`监控缓存命中情况：
- `HIT`: 缓存命中
- `MISS`: 缓存未命中
- `NO-CACHE`: 未使用缓存

### 查询性能

建议监控以下指标：
- API响应时间
- 数据库查询时间
- 前端渲染时间

## 5. 最佳实践

1. **合理设置缓存TTL**: 根据数据更新频率调整缓存时间
2. **及时清除缓存**: 在数据变更后清除相关缓存
3. **使用索引**: 为常用查询字段添加索引
4. **分页加载**: 对于大量数据使用分页
5. **懒加载**: 对于非关键内容使用懒加载

## 6. 未来优化方向

1. **Redis缓存**: 考虑使用Redis实现分布式缓存
2. **CDN加速**: 静态资源使用CDN加速
3. **数据库连接池**: 优化数据库连接管理
4. **GraphQL**: 考虑使用GraphQL减少数据传输
5. **服务端渲染**: 关键页面使用SSR提升首屏加载速度


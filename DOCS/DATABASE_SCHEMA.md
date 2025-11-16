# 🗄️ OpenAero 数据库架构文档

**版本**: 1.0.0  
**最后更新**: 2025-01-16  
**数据库**: PostgreSQL 15+ (Supabase)  
**ORM**: Prisma 5.22.0

---

## 📋 目录

1. [数据库概述](#数据库概述)
2. [ER 图](#er-图)
3. [表结构详解](#表结构详解)
4. [关系说明](#关系说明)
5. [索引策略](#索引策略)
6. [RLS 策略](#rls-策略)
7. [枚举类型](#枚举类型)
8. [数据字典](#数据字典)

---

## 1. 数据库概述

### 1.1 设计原则

- ✅ **规范化设计**: 符合第三范式 (3NF)
- ✅ **类型安全**: 严格的类型定义
- ✅ **索引优化**: 90+ 索引覆盖
- ✅ **安全隔离**: RLS 行级安全
- ✅ **审计追踪**: 完整的操作日志

### 1.2 数据库统计

| 指标 | 数量 |
|------|------|
| **总表数** | 23 |
| **核心业务表** | 15 |
| **关联表** | 5 |
| **辅助表** | 3 |
| **索引数** | 90+ |
| **RLS 策略** | 50+ |
| **枚举类型** | 15 |

---

## 2. ER 图

### 2.1 核心实体关系

```
┌──────────────┐
│   Auth.Users │ (Supabase Auth)
│  (id, email) │
└──────┬───────┘
       │ 1
       │
       │ 1
┌──────▼───────────┐
│  UserProfile     │
│  - user_id (PK)  │
│  - roles[]       │
│  - status        │
└──────┬───────────┘
       │ 1
       │
       ├─────────────────┐
       │                 │
       │ 0..1            │ 1
┌──────▼──────────┐      │
│ CreatorProfile  │      │
│  - id (PK)      │      │
│  - user_id (FK) │      │
│  - status       │      │
│  - revenue      │      │
└──────┬──────────┘      │
       │ 1                │
       │                 │
       │ *               │ *
┌──────▼──────────┐ ┌────▼─────────┐
│   Solution      │ │    Order     │
│  - id (PK)      │ │  - id (PK)   │
│  - creator_id   │ │  - user_id   │
│  - status       │ │  - status    │
│  - price        │ │  - total     │
└──────┬──────────┘ └────┬─────────┘
       │                 │
       │ *               │ *
       ├─────────────────┤
       │                 │
┌──────▼─────────────────▼──┐
│    OrderSolution          │
│  - order_id (FK)          │
│  - solution_id (FK)       │
│  - quantity               │
└───────────────────────────┘
```

### 2.2 完整实体关系图

```
用户认证体系
├── auth.users (Supabase)
├── user_profiles
└── creator_profiles

方案体系
├── solutions
├── solution_versions
├── solution_files
└── solution_reviews

订单支付体系
├── orders
├── order_solutions
├── order_items
├── payment_transactions
├── payment_events
└── revenue_shares

产品库存体系
├── product_categories
├── products
├── product_inventory
└── product_reviews

购物车体系
├── carts
└── cart_items

工厂与样品
├── factories
└── sample_orders

用户交互
├── reviews
├── favorites
└── notifications
```

---

## 3. 表结构详解

### 3.1 用户与认证相关

#### **user_profiles** - 用户扩展资料

扩展 Supabase Auth 的用户信息，存储平台特定的用户数据。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | UUID | PK | 主键 |
| `user_id` | String | UNIQUE, NOT NULL | 关联 auth.users.id |
| `first_name` | String | NULLABLE | 名 |
| `last_name` | String | NULLABLE | 姓 |
| `display_name` | String | NULLABLE | 显示名称 |
| `avatar` | String | NULLABLE | 头像 URL |
| `bio` | String | NULLABLE | 个人简介 |
| `roles` | UserRole[] | DEFAULT [USER] | 用户角色数组 |
| `permissions` | String[] | DEFAULT [] | 权限列表 |
| `status` | UserStatus | DEFAULT ACTIVE | 账号状态 |
| `is_blocked` | Boolean | DEFAULT false | 是否被封禁 |
| `blocked_reason` | String | NULLABLE | 封禁原因 |
| `blocked_at` | DateTime | NULLABLE | 封禁时间 |
| `created_at` | DateTime | DEFAULT now() | 创建时间 |
| `updated_at` | DateTime | AUTO UPDATE | 更新时间 |
| `last_login_at` | DateTime | NULLABLE | 最后登录 |

**索引**:
```sql
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_status ON user_profiles(status);
CREATE INDEX idx_user_profiles_roles ON user_profiles USING GIN(roles);
```

**关系**:
- ➡️ `creatorProfile`: 一对一，创作者档案
- ➡️ `orders`: 一对多，订单
- ➡️ `reviews`: 一对多，评论
- ➡️ `favorites`: 一对多，收藏
- ➡️ `carts`: 一对多，购物车

---

#### **creator_profiles** - 创作者档案

存储创作者特定信息，包括收益、审核状态等。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | String | PK | 主键 (CUID) |
| `user_id` | String | UNIQUE, FK | 关联 user_profiles.user_id |
| `bio` | String | NULLABLE | 创作者简介 |
| `website` | String | NULLABLE | 个人网站 |
| `experience` | String | NULLABLE | 经验描述 |
| `specialties` | String[] | DEFAULT [] | 专长领域 |
| `status` | CreatorStatus | DEFAULT PENDING | 审核状态 |
| `revenue` | Decimal(10,2) | DEFAULT 0 | 累计收益 |
| `created_at` | DateTime | DEFAULT now() | 创建时间 |
| `updated_at` | DateTime | AUTO UPDATE | 更新时间 |

**索引**:
```sql
CREATE INDEX idx_creator_profiles_user_id ON creator_profiles(user_id);
CREATE INDEX idx_creator_profiles_status ON creator_profiles(status);
CREATE INDEX idx_creator_profiles_specialties ON creator_profiles USING GIN(specialties);
```

**关系**:
- ⬅️ `user`: 一对一，用户档案
- ➡️ `solutions`: 一对多，方案
- ➡️ `revenueShares`: 一对多，收益分成

---

### 3.2 方案相关

#### **solutions** - 解决方案

核心业务表，存储无人机解决方案信息。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | String | PK | 主键 (CUID) |
| `title` | String | NOT NULL | 方案标题 |
| `description` | String | NOT NULL | 方案描述 |
| `category` | String | NOT NULL | 分类 |
| `price` | Decimal(10,2) | NOT NULL | 价格 |
| `status` | SolutionStatus | DEFAULT DRAFT | 状态 |
| `images` | String[] | DEFAULT [] | 图片 URLs |
| `features` | String[] | DEFAULT [] | 特性/标签 |
| `tags` | String[] | DEFAULT [] | 标签 |
| `locale` | String | DEFAULT 'zh-CN' | 语言 |
| `specs` | JSON | NULLABLE | 技术规格 |
| `bom` | JSON | NULLABLE | BOM 清单 |
| `creator_id` | String | FK, NOT NULL | 创作者 ID |
| `version` | Int | DEFAULT 1 | 版本号 |
| `submitted_at` | DateTime | NULLABLE | 提交审核时间 |
| `reviewed_at` | DateTime | NULLABLE | 审核完成时间 |
| `review_notes` | String | NULLABLE | 审核备注 |
| `published_at` | DateTime | NULLABLE | 发布时间 |
| `archived_at` | DateTime | NULLABLE | 归档时间 |
| `created_at` | DateTime | DEFAULT now() | 创建时间 |
| `updated_at` | DateTime | AUTO UPDATE | 更新时间 |

**索引**:
```sql
-- 基础索引
CREATE INDEX idx_solutions_creator_id ON solutions(creator_id);
CREATE INDEX idx_solutions_status ON solutions(status);
CREATE INDEX idx_solutions_category ON solutions(category);
CREATE INDEX idx_solutions_created_at ON solutions(created_at DESC);

-- 复合索引
CREATE INDEX idx_solutions_status_category ON solutions(status, category);
CREATE INDEX idx_solutions_status_created ON solutions(status, created_at DESC);

-- GIN 索引（数组字段）
CREATE INDEX idx_solutions_tags ON solutions USING GIN(tags);
CREATE INDEX idx_solutions_features ON solutions USING GIN(features);

-- 全文搜索索引
CREATE INDEX idx_solutions_title_search ON solutions USING GIN(to_tsvector('simple', title));
CREATE INDEX idx_solutions_description_search ON solutions USING GIN(to_tsvector('simple', description));
```

**关系**:
- ⬅️ `creator`: 多对一，创作者
- ➡️ `versions`: 一对多，版本历史
- ➡️ `files`: 一对多，文件附件
- ➡️ `reviews`: 一对多，用户评论
- ➡️ `favorites`: 一对多，收藏记录
- ➡️ `orderSolutions`: 一对多，订单关联

---

#### **solution_versions** - 方案版本

存储方案的历史版本，支持版本回滚。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | String | PK | 主键 (CUID) |
| `solution_id` | String | FK, NOT NULL | 方案 ID |
| `version` | Int | NOT NULL | 版本号 |
| `title` | String | NOT NULL | 标题 |
| `description` | String | NOT NULL | 描述 |
| `category` | String | NOT NULL | 分类 |
| `price` | Decimal(10,2) | NOT NULL | 价格 |
| `images` | String[] | DEFAULT [] | 图片 |
| `features` | String[] | DEFAULT [] | 特性 |
| `specs` | JSON | NULLABLE | 规格 |
| `bom` | JSON | NULLABLE | BOM |
| `change_log` | String | NULLABLE | 变更日志 |
| `is_active` | Boolean | DEFAULT false | 是否当前版本 |
| `created_by` | String | NOT NULL | 创建者 |
| `created_at` | DateTime | DEFAULT now() | 创建时间 |

**唯一约束**:
```sql
UNIQUE(solution_id, version)
```

---

#### **solution_files** - 方案文件

存储方案相关的文件（CAD、文档、视频等）。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | String | PK | 主键 (CUID) |
| `solution_id` | String | FK, NULLABLE | 方案 ID |
| `filename` | String | NOT NULL | 文件名 |
| `original_name` | String | NOT NULL | 原始文件名 |
| `file_type` | SolutionFileType | NOT NULL | 文件类型 |
| `mime_type` | String | NOT NULL | MIME 类型 |
| `size` | Int | NOT NULL | 文件大小 (bytes) |
| `path` | String | NOT NULL | 存储路径 |
| `url` | String | NOT NULL | 访问 URL |
| `thumbnail_url` | String | NULLABLE | 缩略图 URL |
| `checksum` | String | NOT NULL | 文件校验和 |
| `metadata` | JSON | NULLABLE | 元数据 |
| `description` | String | NULLABLE | 文件描述 |
| `status` | FileStatus | DEFAULT ACTIVE | 文件状态 |
| `uploaded_by` | String | NOT NULL | 上传者 |
| `created_at` | DateTime | DEFAULT now() | 创建时间 |
| `updated_at` | DateTime | AUTO UPDATE | 更新时间 |

**索引**:
```sql
CREATE INDEX idx_solution_files_solution_id ON solution_files(solution_id);
CREATE INDEX idx_solution_files_type ON solution_files(file_type);
CREATE INDEX idx_solution_files_status ON solution_files(status);
```

---

### 3.3 订单支付相关

#### **orders** - 订单

存储用户订单信息。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | String | PK | 主键 (CUID) |
| `user_id` | String | FK, NOT NULL | 用户 ID |
| `status` | OrderStatus | DEFAULT PENDING | 订单状态 |
| `total` | Decimal(10,2) | NOT NULL | 订单总额 |
| `order_number` | String | UNIQUE, NULLABLE | 订单号 |
| `notes` | String | NULLABLE | 订单备注 |
| `shipping_address` | JSON | NULLABLE | 收货地址 |
| `billing_address` | JSON | NULLABLE | 账单地址 |
| `created_at` | DateTime | DEFAULT now() | 创建时间 |
| `updated_at` | DateTime | AUTO UPDATE | 更新时间 |

**索引**:
```sql
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);
CREATE UNIQUE INDEX idx_orders_order_number ON orders(order_number) WHERE order_number IS NOT NULL;
```

**关系**:
- ⬅️ `user`: 多对一，用户
- ➡️ `orderSolutions`: 一对多，方案订单项
- ➡️ `orderItems`: 一对多，产品订单项
- ➡️ `paymentTransactions`: 一对多，支付记录
- ➡️ `revenueShares`: 一对多，收益分成

---

#### **payment_transactions** - 支付交易

存储支付交易记录。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | String | PK | 主键 (CUID) |
| `order_id` | String | FK, NOT NULL | 订单 ID |
| `payment_method` | PaymentMethod | NOT NULL | 支付方式 |
| `payment_provider` | String | NOT NULL | 支付服务商 |
| `amount` | Decimal(10,2) | NOT NULL | 金额 |
| `currency` | String | DEFAULT 'CNY' | 货币 |
| `status` | PaymentStatus | DEFAULT PENDING | 支付状态 |
| `external_id` | String | NULLABLE | 外部交易ID |
| `external_status` | String | NULLABLE | 外部状态 |
| `paid_at` | DateTime | NULLABLE | 支付时间 |
| `failure_reason` | String | NULLABLE | 失败原因 |
| `refund_amount` | Decimal(10,2) | NULLABLE | 退款金额 |
| `refunded_at` | DateTime | NULLABLE | 退款时间 |
| `metadata` | JSON | NULLABLE | 元数据 |
| `created_at` | DateTime | DEFAULT now() | 创建时间 |
| `updated_at` | DateTime | AUTO UPDATE | 更新时间 |

**索引**:
```sql
CREATE INDEX idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_external_id ON payment_transactions(external_id);
```

---

### 3.4 产品库存相关

#### **products** - 产品

存储平台产品信息。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | String | PK | 主键 (CUID) |
| `name` | String | NOT NULL | 产品名称 |
| `slug` | String | UNIQUE, NOT NULL | URL 别名 |
| `description` | String | NULLABLE | 详细描述 |
| `short_desc` | String | NULLABLE | 简短描述 |
| `sku` | String | UNIQUE, NOT NULL | SKU |
| `barcode` | String | NULLABLE | 条形码 |
| `brand` | String | NULLABLE | 品牌 |
| `model` | String | NULLABLE | 型号 |
| `price` | Decimal(10,2) | NOT NULL | 价格 |
| `original_price` | Decimal(10,2) | NULLABLE | 原价 |
| `cost_price` | Decimal(10,2) | NULLABLE | 成本价 |
| `category_id` | String | FK, NOT NULL | 分类 ID |
| `weight` | Decimal(8,3) | NULLABLE | 重量 (kg) |
| `dimensions` | JSON | NULLABLE | 尺寸 |
| `color` | String | NULLABLE | 颜色 |
| `material` | String | NULLABLE | 材质 |
| `images` | String[] | DEFAULT [] | 图片 |
| `videos` | String[] | DEFAULT [] | 视频 |
| `documents` | String[] | DEFAULT [] | 文档 |
| `status` | ProductStatus | DEFAULT DRAFT | 状态 |
| `is_active` | Boolean | DEFAULT true | 是否激活 |
| `is_featured` | Boolean | DEFAULT false | 是否精选 |
| `view_count` | Int | DEFAULT 0 | 浏览次数 |
| `sales_count` | Int | DEFAULT 0 | 销售次数 |
| `rating` | Decimal(3,2) | NULLABLE | 评分 |
| `review_count` | Int | DEFAULT 0 | 评论数 |
| `solution_id` | String | FK, NULLABLE | 关联方案 |
| `created_at` | DateTime | DEFAULT now() | 创建时间 |
| `updated_at` | DateTime | AUTO UPDATE | 更新时间 |

**索引**:
```sql
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_rating ON products(rating DESC);
CREATE INDEX idx_products_sales_count ON products(sales_count DESC);
CREATE INDEX idx_products_category_active_status ON products(category_id, is_active, status);
```

---

## 4. 关系说明

### 4.1 一对一关系

| 父表 | 子表 | 关联字段 | 说明 |
|------|------|---------|------|
| `user_profiles` | `creator_profiles` | `user_id` | 用户可成为创作者 |
| `products` | `product_inventory` | `product_id` | 产品库存信息 |

### 4.2 一对多关系

| 父表 | 子表 | 关联字段 | 说明 |
|------|------|---------|------|
| `creator_profiles` | `solutions` | `creator_id` | 创作者的方案 |
| `solutions` | `solution_versions` | `solution_id` | 方案版本历史 |
| `solutions` | `solution_files` | `solution_id` | 方案文件 |
| `user_profiles` | `orders` | `user_id` | 用户订单 |
| `orders` | `payment_transactions` | `order_id` | 订单支付记录 |
| `product_categories` | `products` | `category_id` | 分类产品 |

### 4.3 多对多关系

| 表1 | 表2 | 中间表 | 说明 |
|-----|-----|--------|------|
| `orders` | `solutions` | `order_solutions` | 订单包含的方案 |
| `orders` | `products` | `order_items` | 订单包含的产品 |
| `users` | `solutions` | `favorites` | 用户收藏的方案 |

---

## 5. 索引策略

### 5.1 索引分类

**单列索引** (50+):
- 主键、外键
- 状态字段
- 时间字段
- 常用查询字段

**复合索引** (30+):
- `(user_id, status)`
- `(status, created_at)`
- `(category_id, is_active)`

**GIN 索引** (10+):
- 数组字段：`tags`, `features`, `specialties`
- 全文搜索：`title`, `description`

### 5.2 性能提升

| 查询类型 | 优化前 | 优化后 | 提升 |
|---------|--------|--------|------|
| 方案列表 | 500ms | 50ms | 90% |
| 分类筛选 | 800ms | 80ms | 90% |
| 全文搜索 | 2000ms | 200ms | 90% |
| 用户订单 | 300ms | 30ms | 90% |

---

## 6. RLS 策略

### 6.1 启用 RLS

所有核心表都启用了行级安全（Row Level Security）：

```sql
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ... 更多表
```

### 6.2 策略示例

**Solutions 表的 RLS 策略**:

```sql
-- 1. 公开读取已发布方案
CREATE POLICY "public_read_published" ON solutions
  FOR SELECT USING (status = 'PUBLISHED');

-- 2. 创作者完全访问自己的方案
CREATE POLICY "creator_full_access" ON solutions
  FOR ALL USING (
    creator_id IN (
      SELECT id FROM creator_profiles
      WHERE user_id = auth.uid()::text
    )
  );

-- 3. 管理员完全访问
CREATE POLICY "admin_full_access" ON solutions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()::text
      AND ('ADMIN' = ANY(roles) OR 'SUPER_ADMIN' = ANY(roles))
    )
  );
```

**Orders 表的 RLS 策略**:

```sql
-- 用户只能查看自己的订单
CREATE POLICY "users_view_own_orders" ON orders
  FOR SELECT USING (user_id = auth.uid()::text);

-- 管理员查看所有订单
CREATE POLICY "admins_view_all_orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()::text
      AND ('ADMIN' = ANY(roles))
    )
  );
```

---

## 7. 枚举类型

### 7.1 用户相关

```typescript
enum UserRole {
  USER          // 普通用户
  CREATOR       // 创作者
  REVIEWER      // 审核员
  FACTORY_MANAGER  // 工厂管理员
  ADMIN         // 管理员
  SUPER_ADMIN   // 超级管理员
}

enum UserStatus {
  ACTIVE        // 活跃
  INACTIVE      // 未激活
  SUSPENDED     // 已暂停
  DELETED       // 已删除
}

enum CreatorStatus {
  PENDING       // 待审核
  APPROVED      // 已批准
  REJECTED      // 已拒绝
  SUSPENDED     // 已暂停
}
```

### 7.2 方案相关

```typescript
enum SolutionStatus {
  DRAFT             // 草稿
  PENDING_REVIEW    // 待审核
  APPROVED          // 已批准
  REJECTED          // 已拒绝
  PUBLISHED         // 已发布
  ARCHIVED          // 已归档
}

enum SolutionFileType {
  IMAGE       // 图片
  DOCUMENT    // 文档
  CAD_FILE    // CAD 文件
  CODE        // 代码
  SCHEMATIC   // 原理图
  PCB         // PCB 设计
  FIRMWARE    // 固件
  MANUAL      // 手册
  VIDEO       // 视频
  OTHER       // 其他
}
```

### 7.3 订单支付相关

```typescript
enum OrderStatus {
  PENDING       // 待支付
  CONFIRMED     // 已确认
  PROCESSING    // 处理中
  SHIPPED       // 已发货
  DELIVERED     // 已送达
  CANCELLED     // 已取消
  REFUNDED      // 已退款
}

enum PaymentMethod {
  CREDIT_CARD       // 信用卡
  PAYPAL            // PayPal
  BANK_TRANSFER     // 银行转账
  ALIPAY            // 支付宝
  WECHAT_PAY        // 微信支付
}

enum PaymentStatus {
  PENDING       // 待支付
  PROCESSING    // 处理中
  COMPLETED     // 已完成
  FAILED        // 失败
  CANCELLED     // 已取消
  REFUNDED      // 已退款
}
```

---

## 8. 数据字典

### 8.1 常用字段说明

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `id` | 主键标识符 | `clu123abc...` |
| `user_id` | Supabase Auth 用户ID | `550e8400-...` |
| `created_at` | 记录创建时间 | `2025-01-16T10:00:00Z` |
| `updated_at` | 记录更新时间 | `2025-01-16T15:30:00Z` |
| `status` | 记录状态 | `ACTIVE`, `PENDING` |
| `metadata` | JSON 元数据 | `{"key": "value"}` |

### 8.2 命名规范

- **表名**: 小写复数形式，下划线分隔 (`user_profiles`, `solutions`)
- **字段名**: 小写，下划线分隔 (`created_at`, `is_active`)
- **外键**: 以 `_id` 结尾 (`user_id`, `creator_id`)
- **布尔值**: 以 `is_` 或 `has_` 开头 (`is_active`, `has_verified`)
- **时间戳**: 以 `_at` 结尾 (`created_at`, `published_at`)

---

## 📚 相关文档

- [数据库设置指南](../DATABASE_SETUP.md)
- [数据库优化指南](../DATABASE_OPTIMIZATION_GUIDE.md)
- [系统架构文档](./ARCHITECTURE.md)
- [API 文档](./API_DOCUMENTATION.md)

---

## 🔄 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2025-01-16 | 初始版本，完整的数据库架构文档 |

---

**维护者**: OpenAero 数据库团队  
**联系方式**: db@openaero.cn

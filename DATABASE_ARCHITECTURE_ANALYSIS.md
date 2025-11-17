# 🏗️ OpenAero 数据库架构分析报告

## 📋 执行摘要

**生成时间**: 2025-11-16  
**分析范围**: Supabase 使用方式、RLS 策略、Prisma 集成

---

## 1️⃣ Supabase 使用方式

### 当前架构：混合模式

```
┌─────────────────────────────────────────────────────────────┐
│                     前端 (Next.js)                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  认证相关 (Auth)          业务数据 (Business Data)          │
│       ↓                           ↓                         │
│  Supabase Client          Prisma Client                     │
│       ↓                           ↓                         │
│  直连 Supabase            API Routes → Prisma → Supabase   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 详细说明

#### ✅ **使用 Supabase 直连的场景**

**位置**: `src/lib/auth/supabase-client.ts`

```typescript
// 1. 浏览器端客户端 - 用于客户端组件
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'openaero-auth',
  },
});

// 2. 服务器端客户端 - 用于服务器组件和 API 路由
export async function createSupabaseServer() { ... }

// 3. Admin 客户端 - 使用 Service Role Key
export function createSupabaseAdmin() { ... }
```

**用途**:
- ✅ **用户认证**：注册、登录、登出、密码重置
- ✅ **Session 管理**：Token 刷新、验证
- ✅ **邮箱验证**：PKCE code 交换
- ✅ **用户元数据**：访问 `auth.users` 表

**涉及的文件**:
```
src/contexts/AuthContext.tsx          # 前端 Auth Context
src/app/api/auth/callback/route.ts    # 邮箱验证回调
src/app/api/auth/login/route.ts       # 登录
src/app/api/auth/register/route.ts    # 注册
src/app/api/auth/logout/route.ts      # 登出
src/app/api/auth/sync-session/route.ts # Session 同步
```

#### ✅ **使用 Prisma 的场景**

**位置**: `src/lib/prisma.ts`

```typescript
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
```

**用途**:
- ✅ **所有业务数据操作**：CRUD
- ✅ **复杂查询**：关联查询、聚合、事务
- ✅ **数据验证**：TypeScript 类型安全

**涉及的表** (共 24 张表):
```typescript
// 用户相关
user_profiles           // ✅ Prisma
creator_profiles        // ✅ Prisma

// 解决方案相关
solutions               // ✅ Prisma
solution_versions       // ✅ Prisma
solution_files          // ✅ Prisma
solution_reviews        // ✅ Prisma

// 订单相关
orders                  // ✅ Prisma
order_solutions         // ✅ Prisma
order_items             // ✅ Prisma

// 支付相关
payment_transactions    // ✅ Prisma
payment_events          // ✅ Prisma
revenue_shares          // ✅ Prisma

// 评论与收藏
reviews                 // ✅ Prisma
favorites               // ✅ Prisma
product_reviews         // ✅ Prisma

// 产品相关
product_categories      // ✅ Prisma
products                // ✅ Prisma
product_inventory       // ✅ Prisma

// 购物车
carts                   // ✅ Prisma
cart_items              // ✅ Prisma

// 工厂
factories               // ✅ Prisma
sample_orders           // ✅ Prisma

// 通知
notifications           // ✅ Prisma
```

**涉及的 API 路由** (130+ 个):
```
src/app/api/solutions/route.ts          # 解决方案 CRUD
src/app/api/orders/route.ts             # 订单管理
src/app/api/products/route.ts           # 产品管理
src/app/api/creators/dashboard/stats/route.ts  # 创作者统计
src/app/api/revenue/route.ts            # 收益管理
src/app/api/admin/users/route.ts        # 用户管理
... 还有 120+ 个 API 路由
```

### 为什么是混合模式？

#### 优势分析

| 场景 | 技术选择 | 原因 |
|------|---------|------|
| **认证** | Supabase | - 内置完整的认证系统<br>- 自动处理 JWT<br>- 支持多种登录方式<br>- RLS 原生集成 |
| **业务数据** | Prisma | - 类型安全<br>- 强大的查询 API<br>- 事务支持<br>- 代码自动生成 |

#### 潜在风险

⚠️ **RLS 策略失效问题**:
```typescript
// Prisma 使用 Service Role 连接时会绕过 RLS！
// DATABASE_URL = postgresql://postgres:[password]@[host]/postgres

// 示例：Prisma 查询不受 RLS 限制
const allProfiles = await prisma.userProfile.findMany();
// ❌ 返回所有用户的 profiles，不管当前登录用户是谁
```

**解决方案**:
```typescript
// 在应用层手动实现权限检查
const authResult = await authenticateRequest(request);
if (!authResult.success) {
  return createErrorResponse('Unauthorized', 401);
}

// 手动过滤数据
const where = {
  user_id: authResult.user.id  // ✅ 手动添加权限过滤
};
const myProfile = await prisma.userProfile.findUnique({ where });
```

---

## 2️⃣ 启用了 RLS 的表

### 完整列表 (24 张表)

根据 `supabase/migrations/000_prisma_generated.sql`:

```sql
-- 657-721 行
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "creator_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "solutions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "solution_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "solution_files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "solution_reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_solutions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "revenue_shares" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "favorites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "factories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sample_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "carts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cart_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
```

### ⚠️ **但是！只有 2 张表有实际策略**

#### ✅ 有策略的表

| 表名 | 策略数量 | 策略来源 |
|------|---------|---------|
| `user_profiles` | 6+ | `001_create_user_profiles.sql`<br>`004_fix_user_profiles_rls_recursion.sql`<br>`014_complete_auth_fix.sql` |
| `creator_profiles` | 3 | `001_create_user_tables.sql`<br>`002_update_creator_profiles.sql` |

#### ❌ 没有策略的表 (22 张)

```
solutions, solution_versions, solution_files, solution_reviews
orders, order_solutions, order_items
payment_transactions, payment_events, revenue_shares
reviews, favorites, product_reviews
product_categories, products, product_inventory
carts, cart_items
factories, sample_orders
notifications
```

**影响**:
```sql
-- ⚠️ 这些表启用了 RLS 但没有策略
-- 结果：默认拒绝所有访问！

-- 示例：使用 Supabase Client 查询
const { data, error } = await supabase
  .from('solutions')
  .select('*');

-- ❌ 错误：new row violates row-level security policy
```

**为什么没有报错？**
```typescript
// 因为项目使用 Prisma 连接数据库
// Prisma 使用的是 postgres 角色，不受 RLS 限制

const solutions = await prisma.solution.findMany();
// ✅ 成功，因为 Prisma 绕过了 RLS
```

---

## 3️⃣ Prisma 是否控制全部数据库查询？

### ✅ 答案：是的，几乎全部

#### 统计数据

```bash
# 搜索结果显示
- Prisma 导入: 577+ 次
- API 路由文件: 130+ 个
- 所有业务 API 都使用 Prisma
```

#### 详细分析

| 操作类型 | 使用技术 | 占比 |
|---------|---------|------|
| **用户认证** | Supabase Auth | ~5% |
| **Session 管理** | Supabase Auth | ~5% |
| **业务数据 CRUD** | Prisma | ~90% |

#### 示例代码

**认证 API** (使用 Supabase):
```typescript
// src/app/api/auth/register/route.ts
const supabase = createSupabaseServer();
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: { emailRedirectTo }
});
```

**业务 API** (使用 Prisma):
```typescript
// src/app/api/solutions/route.ts
const solutions = await prisma.solution.findMany({
  where,
  include: {
    creator: {
      include: {
        user: {
          select: {
            display_name: true,
            first_name: true,
            last_name: true
          }
        }
      }
    },
    _count: {
      select: {
        solutionReviews: true,
        files: true,
        reviews: true
      }
    }
  },
  orderBy: { created_at: 'desc' },
  skip: (page - 1) * limit,
  take: limit
});
```

**用户资料 API** (混合使用):
```typescript
// src/app/api/users/me/route.ts

// 1. 使用 Supabase 获取当前用户
const supabase = await createSupabaseServer();
const { data: { user } } = await supabase.auth.getUser();

// 2. 使用 Prisma 获取用户资料
const userProfile = await prisma.userProfile.findUnique({
  where: { user_id: user.id },
  include: {
    creatorProfile: true
  }
});
```

---

## 4️⃣ 当前架构的问题和风险

### 🔴 **严重问题**

#### 1. **RLS 策略缺失**

**问题**:
- 24 张表启用了 RLS
- 只有 2 张表有策略
- 22 张表无法通过 Supabase Client 访问

**影响**:
```typescript
// 如果以后想从前端直接访问 Supabase
const { data } = await supabaseBrowser
  .from('solutions')
  .select('*');
// ❌ 错误：permission denied
```

**风险等级**: 🟡 中等（当前不影响，因为用 Prisma）

#### 2. **Prisma 绕过 RLS**

**问题**:
```typescript
// Prisma 使用 postgres 角色连接
DATABASE_URL="postgresql://postgres:password@host/db"

// 完全绕过 RLS，依赖应用层权限检查
const allOrders = await prisma.order.findMany();
// ⚠️ 返回所有订单，不管当前用户是谁
```

**正确做法**:
```typescript
// 在每个 API 中手动检查权限
const authResult = await authenticateRequest(request);
if (!authResult.success) {
  return createErrorResponse('Unauthorized', 401);
}

// 手动过滤数据
const myOrders = await prisma.order.findMany({
  where: { user_id: authResult.user.id }  // ✅ 手动权限过滤
});
```

**风险等级**: 🔴 高（容易出现权限漏洞）

#### 3. **迁移文件混乱**

**问题**:
```
000_prisma_generated.sql       # Prisma 生成，启用 RLS
001_create_user_profiles.sql   # 手动创建，添加策略
004_fix_rls_recursion.sql      # 手动修复，覆盖策略
hotfix_complete_registration.sql  # ❌ 未纳入迁移系统
014_complete_auth_fix.sql      # 最新修复
```

**风险等级**: 🔴 高（重新部署会丢失修复）

### 🟡 **中等问题**

#### 1. **双重数据模型维护**

```typescript
// Prisma Schema (prisma/schema.prisma)
model UserProfile {
  id         String   @id @default(uuid())
  user_id    String   @unique
  roles      UserRole[] @default([USER])
  ...
}

// Supabase Types (src/lib/auth/supabase-client.ts)
export interface UserProfile {
  id: string;
  user_id: string;
  roles: UserRole[];
  ...
}
```

**问题**: 两个地方定义相同的类型，容易不一致

**建议**: 使用 Prisma 生成的类型

#### 2. **缺少数据库级别的权限控制**

```sql
-- 当前：RLS 启用但无策略
-- 所有安全性依赖应用代码

-- 理想：数据库级别的安全策略
CREATE POLICY "users_view_own_orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 5️⃣ 建议的改进方案

### 方案 A：完全使用 Prisma（推荐）

**适用场景**: 当前架构，后端 API 主导

```typescript
// ✅ 优势
- 统一的数据访问层
- 类型安全
- 强大的查询能力
- 事务支持

// ⚠️ 注意
- 必须在应用层实现权限检查
- 需要完善的单元测试
- 代码审查确保安全
```

**实施步骤**:
1. 保持当前架构
2. **强化应用层权限检查**:
   ```typescript
   // 在每个 API 路由中
   const authResult = await authenticateRequest(request);
   if (!authResult.success) {
     return createErrorResponse('Unauthorized', 401);
   }
   
   // 检查资源权限
   const hasPermission = await checkResourcePermission(
     authResult.user,
     resourceId,
     'read'
   );
   ```
3. 创建权限中间件
4. 添加权限单元测试

### 方案 B：混合模式增强

**适用场景**: 需要前端直接访问部分数据

```typescript
// 认证: Supabase
// 公开数据: Supabase (有 RLS)
// 私有数据: Prisma (API)
```

**实施步骤**:
1. **为公开数据表添加 RLS 策略**:
   ```sql
   -- 公开浏览方案
   CREATE POLICY "anyone_view_published_solutions"
     ON solutions FOR SELECT
     USING (status = 'PUBLISHED');
   
   -- 创作者管理自己的方案
   CREATE POLICY "creators_manage_own_solutions"
     ON solutions FOR ALL
     USING (creator_id IN (
       SELECT id FROM creator_profiles
       WHERE user_id = auth.uid()
     ));
   ```

2. **前端直接访问公开数据**:
   ```typescript
   // 无需 API，直接查询
   const { data } = await supabaseBrowser
     .from('solutions')
     .select('*')
     .eq('status', 'PUBLISHED');
   ```

3. **私有数据继续用 API + Prisma**

### 方案 C：完全迁移到 RLS（不推荐）

**问题**:
- 需要为 22 张表创建 RLS 策略
- 复杂的权限逻辑难以用 RLS 表达
- Prisma 集成复杂
- 性能影响

---

## 6️⃣ 立即执行的修复清单

### 🔴 高优先级

- [ ] **执行 `014_complete_auth_fix.sql`** - 修复认证流程
- [ ] **删除 `hotfix_complete_registration.sql`** - 避免混淆
- [ ] **创建权限检查中间件**:
  ```typescript
  // src/lib/auth/permission-middleware.ts
  export async function requireAuth(request: NextRequest) {
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      throw new Error('Unauthorized');
    }
    return authResult.user;
  }
  ```
- [ ] **审计所有 API 路由** - 确保都有权限检查

### 🟡 中优先级

- [ ] **为公开数据添加 RLS 策略**:
  ```sql
  CREATE POLICY "view_published_solutions" ON solutions ...
  CREATE POLICY "view_product_categories" ON product_categories ...
  ```
- [ ] **整合迁移文件** - 清理重复的策略定义
- [ ] **创建数据库文档** - 记录每张表的用途和权限

### 🟢 低优先级

- [ ] **添加权限单元测试**
- [ ] **性能监控** - 检查 Prisma 查询性能
- [ ] **考虑使用 Prisma Row Level Security Extension**

---

## 7️⃣ 总结

| 问题 | 当前状态 | 建议 |
|------|---------|------|
| **Supabase 使用方式** | 仅用于认证 | ✅ 合理，保持现状 |
| **RLS 启用表** | 24 张表 | ⚠️ 需要补充策略或禁用无用的 RLS |
| **RLS 策略覆盖** | 仅 2 张表 | 🔴 补充关键表的策略 |
| **Prisma 控制查询** | 是，90%+ | ✅ 但需要加强应用层权限 |
| **权限检查** | 分散在各 API | 🔴 需要统一的中间件 |
| **迁移管理** | 混乱 | 🔴 需要整理和规范 |

### 🎯 **最关键的行动项**

1. **立即执行 `014_complete_auth_fix.sql`** - 修复认证死循环
2. **创建统一的权限中间件** - 防止权限漏洞
3. **审计所有 API 路由** - 确保安全
4. **决定 RLS 策略** - 要么补充策略，要么禁用无用的 RLS

---

**报告结束** 📊

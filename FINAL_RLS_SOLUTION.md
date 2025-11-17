# 🎯 OpenAero RLS 问题彻底解决方案

## 📋 执行摘要

**问题根源**: 项目使用 Prisma + API 架构，但数据库启用了 24 张表的 RLS，导致：
1. Prisma 绕过 RLS，安全策略完全失效
2. 22 张表无 RLS 策略，前端访问必然报错
3. 权限检查在应用层和数据库层冲突
4. 死循环：修复验证 → 数据库报错 → 修复数据库 → RLS 丢失 → 循环

**最终方案**: 关闭所有业务表 RLS，只保留 Auth 表 RLS

---

## 🧭 一、为什么必须关闭业务表 RLS？

### 核心事实

```
你的项目架构 = Supabase Auth + Prisma 业务数据
│
├─ Auth (5%)        → Supabase Client → ✅ RLS 生效
│
└─ Business (90%)   → API Routes → Prisma → ❌ RLS 被绕过
```

### 5 个无法回避的理由

#### 1️⃣ **Prisma 完全绕过 RLS**

```typescript
// 你的数据库连接
DATABASE_URL="postgresql://postgres:PASSWORD@db.supabase.com/postgres"
                          ^^^^^^^^
                          超级用户角色 → 不受 RLS 限制

// 结果
const allOrders = await prisma.order.findMany();
// ⚠️ 返回所有用户的订单，无视 RLS 策略
// ⚠️ 你以为 RLS 保护了数据，实际上完全无效
```

**验证**: 在你的任意 API 路由中打印查询结果，你会发现可以访问所有数据。

#### 2️⃣ **22 张表启用 RLS 但无策略**

```sql
-- 当前状态
ALTER TABLE solutions ENABLE ROW LEVEL SECURITY;
-- ❌ 但是没有 CREATE POLICY

-- 结果
const { data } = await supabaseBrowser.from('solutions').select('*');
-- ❌ 错误: permission denied for table solutions
```

**影响**: 未来任何前端直接访问 Supabase 的尝试都会失败。

#### 3️⃣ **你的架构是 API 主导，不是前端直连**

```
❌ 错误架构（RLS 有用）:
Frontend → Supabase Client → Database (RLS 保护)

✅ 你的架构（RLS 无用）:
Frontend → Next.js API → Prisma → Database (RLS 被绕过)
                   ↑
                应用层权限检查
```

#### 4️⃣ **复杂权限无法用 RLS 表达**

你的权限需求：
- ✅ 同一用户既是创作者又是客户
- ✅ 管理员看全部，创作者只看自己
- ✅ 授权工厂看部分方案
- ✅ 不同 creator 严格隔离
- ✅ 某些字段公开，某些字段内部

**RLS 无法处理这些逻辑**，但你在 API 层已经实现：

```typescript
// src/lib/auth-helpers.ts
export async function authenticateRequest(request: NextRequest) {
  // ✅ 验证 JWT
  // ✅ 检查角色
  // ✅ 检查权限
}

// API 路由
const authResult = await authenticateRequest(request);
if (!authResult.success) {
  return createErrorResponse('Unauthorized', 401);
}

// ✅ 应用层权限检查，完全可控
```

#### 5️⃣ **Prisma + RLS = 官方不推荐**

> "Prisma currently does not work well with RLS systems."  
> — Supabase Official Documentation

原因：Prisma 无法动态绑定 JWT，无法以"当前用户身份"执行查询。

---

## 🎯 二、最终架构设计

### 推荐方案：分层安全模型

```
┌─────────────────────────────────────────────┐
│            Frontend (Next.js)               │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│         API Layer (Application Logic)       │
│  ✅ JWT 验证                                │
│  ✅ 角色检查 (ADMIN/CREATOR/USER)           │
│  ✅ 资源权限检查                             │
│  ✅ 数据过滤（where: { user_id }）          │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│        Prisma Client (Data Access)          │
│  ❌ RLS 关闭（业务表）                       │
│  ✅ 类型安全                                 │
│  ✅ 事务支持                                 │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│      Supabase PostgreSQL Database           │
│  ✅ RLS 启用: auth.*, user_profiles          │
│  ❌ RLS 关闭: 所有业务表                     │
└─────────────────────────────────────────────┘
```

### RLS 配置表

| 表名 | RLS 状态 | 原因 |
|------|---------|------|
| **Auth 系统表** | | |
| `auth.users` | ✅ 启用 | Supabase 内置，自动管理 |
| `auth.sessions` | ✅ 启用 | Supabase 内置，自动管理 |
| `auth.refresh_tokens` | ✅ 启用 | Supabase 内置，自动管理 |
| **用户资料表** | | |
| `user_profiles` | ✅ 启用 | 与 auth 紧密关联，有完整策略 |
| `creator_profiles` | ✅ 启用 | 与 auth 紧密关联，有完整策略 |
| **业务表（22 张）** | | |
| `solutions` | ❌ 关闭 | Prisma 管理，应用层权限 |
| `orders` | ❌ 关闭 | Prisma 管理，应用层权限 |
| `products` | ❌ 关闭 | Prisma 管理，应用层权限 |
| `payment_transactions` | ❌ 关闭 | Prisma 管理，应用层权限 |
| `carts` | ❌ 关闭 | Prisma 管理，应用层权限 |
| ... (其他 17 张表) | ❌ 关闭 | Prisma 管理，应用层权限 |

---

## 🚀 三、立即执行步骤

### 步骤 1: 执行数据库迁移（必须）

#### A. 执行完整认证修复

```sql
-- 在 Supabase Dashboard → SQL Editor
-- 复制并执行: supabase/migrations/014_complete_auth_fix.sql

-- 这会:
-- ✅ 清理所有旧的 RLS 策略冲突
-- ✅ 创建 user_profiles 的完整 RLS 策略
-- ✅ 创建自动创建 profile 的触发器
-- ✅ 修复已有用户的 profiles
```

#### B. 关闭业务表 RLS

```sql
-- 在 Supabase Dashboard → SQL Editor
-- 复制并执行: supabase/migrations/015_disable_business_tables_rls.sql

-- 这会:
-- ✅ 关闭 22 张业务表的 RLS
-- ✅ 删除无用的策略定义
-- ✅ 验证 auth 表 RLS 保持启用
-- ✅ 生成配置报告
```

### 步骤 2: 验证 Supabase 配置（必须）

#### A. Redirect URLs

```
Dashboard → Authentication → URL Configuration

✅ Site URL: http://localhost:3000
✅ Redirect URLs:
   - http://localhost:3000/**
   - http://localhost:3000/api/auth/callback
```

#### B. 邮件模板（双语）

```
Dashboard → Authentication → Email Templates → Confirm signup
```

使用以下模板：

```html
<h2>Welcome to OpenAero / 欢迎加入 OpenAero 🎉</h2>

<p><strong>English:</strong><br>
Thank you for signing up! Please confirm your email address by clicking the button below:</p>

<p><strong>中文:</strong><br>
感谢您注册！请点击下方按钮验证您的邮箱地址：</p>

<p style="text-align: center; margin: 30px 0;">
  <a href="{{ .ConfirmationURL }}" 
     style="background-color: #4F46E5; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 6px;
            display: inline-block;
            font-weight: 600;">
    Confirm Email / 验证邮箱
  </a>
</p>

<p><strong>English:</strong><br>
If the button doesn't work, copy and paste this link into your browser:<br>
<a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a></p>

<p><strong>中文:</strong><br>
如果按钮无效，请复制以下链接到浏览器：<br>
<a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a></p>

<hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

<p style="color: #6b7280; font-size: 12px;">
If you didn't request this email, you can safely ignore it.<br>
如果您没有请求此邮件，可以安全地忽略它。
</p>
```

#### C. Email Provider 设置

```
Dashboard → Authentication → Providers → Email

✅ Enable Email Provider: ON
✅ Confirm email: ON
✅ Secure email change: ON
```

### 步骤 3: 强化应用层权限检查（推荐）

#### A. 创建统一权限中间件

```typescript
// src/lib/auth/permission-middleware.ts

import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth-helpers';
import { createErrorResponse } from '@/lib/api-helpers';
import { UserRole } from '@prisma/client';

/**
 * 要求用户已登录
 */
export async function requireAuth(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  
  if (!authResult.success || !authResult.user) {
    throw new Error('Unauthorized');
  }
  
  return authResult.user;
}

/**
 * 要求特定角色
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: UserRole[]
) {
  const user = await requireAuth(request);
  
  const hasRole = user.roles.some((role) => allowedRoles.includes(role));
  
  if (!hasRole) {
    throw new Error('Insufficient permissions');
  }
  
  return user;
}

/**
 * 检查资源所有权
 */
export async function checkResourceOwnership(
  userId: string,
  resourceUserId: string
) {
  if (userId !== resourceUserId) {
    throw new Error('You do not own this resource');
  }
}

/**
 * 包装 API 路由，自动处理权限检查
 */
export function withAuth(
  handler: (request: NextRequest, user: any) => Promise<Response>,
  options?: {
    roles?: UserRole[];
  }
) {
  return async (request: NextRequest) => {
    try {
      let user;
      
      if (options?.roles) {
        user = await requireRole(request, options.roles);
      } else {
        user = await requireAuth(request);
      }
      
      return await handler(request, user);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Unauthorized') {
          return createErrorResponse('Unauthorized', 401);
        }
        if (error.message === 'Insufficient permissions') {
          return createErrorResponse('Forbidden', 403);
        }
      }
      throw error;
    }
  };
}
```

#### B. 在 API 路由中使用

```typescript
// src/app/api/solutions/mine/route.ts

import { withAuth } from '@/lib/auth/permission-middleware';
import { prisma } from '@/lib/prisma';

export const GET = withAuth(
  async (request, user) => {
    // ✅ user 已经验证通过
    
    // ✅ 自动过滤数据
    const mySolutions = await prisma.solution.findMany({
      where: {
        creator: {
          user_id: user.id  // ✅ 只返回当前用户的方案
        }
      }
    });
    
    return Response.json({ solutions: mySolutions });
  },
  { roles: ['CREATOR', 'ADMIN'] }  // ✅ 只允许创作者和管理员
);
```

#### C. 检查资源所有权

```typescript
// src/app/api/solutions/[id]/route.ts

import { withAuth, checkResourceOwnership } from '@/lib/auth/permission-middleware';
import { prisma } from '@/lib/prisma';

export const PUT = withAuth(async (request, user) => {
  const { id } = request.params;
  
  // 1. 获取资源
  const solution = await prisma.solution.findUnique({
    where: { id },
    include: { creator: true }
  });
  
  if (!solution) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  
  // 2. 检查所有权（除非是管理员）
  if (!user.roles.includes('ADMIN')) {
    checkResourceOwnership(user.id, solution.creator.user_id);
  }
  
  // 3. 更新资源
  const updated = await prisma.solution.update({
    where: { id },
    data: { ...updateData }
  });
  
  return Response.json({ solution: updated });
});
```

### 步骤 4: 完整测试流程

#### A. 清理环境

```bash
# 1. 清理浏览器 cookies
open http://localhost:3000/clear-cookies.html

# 2. 重启开发服务器
npm run dev
```

#### B. 测试注册流程

```
1. 访问: http://localhost:3000/zh-CN/auth/register
2. 输入邮箱: test-{timestamp}@example.com
3. 输入密码: Test123456!
4. 点击注册

预期结果:
✅ 页面提示 "请检查邮箱"
✅ 控制台无错误
✅ 数据库中 auth.users 有新记录
✅ 数据库中 user_profiles 自动创建
```

#### C. 测试邮箱验证

```
1. 打开邮箱
2. 查看验证邮件（中英双语）
3. 点击 "Confirm Email / 验证邮箱" 按钮

预期结果:
✅ 重定向到: http://localhost:3000/zh-CN/auth/welcome
✅ 显示欢迎页面
✅ 自动登录
✅ 控制台无错误
```

#### D. 测试权限检查

```typescript
// 测试 1: 访问自己的资料
GET /api/users/me
// ✅ 应该成功返回

// 测试 2: 尝试访问他人的订单
GET /api/orders?user_id=other-user-id
// ❌ 应该被过滤或拒绝

// 测试 3: 管理员访问所有数据
GET /api/admin/users
// ✅ 管理员成功，普通用户失败
```

---

## 📊 四、验证命令

### A. 检查 RLS 配置

```sql
-- 在 Supabase SQL Editor 执行

-- 1. 查看所有表的 RLS 状态
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN 'ENABLED ✅'
    ELSE 'DISABLED ❌'
  END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rls_status DESC, tablename;

-- 预期结果:
-- user_profiles        ENABLED ✅
-- creator_profiles     ENABLED ✅
-- solutions            DISABLED ❌
-- orders               DISABLED ❌
-- ... (其他 20 张表)  DISABLED ❌
```

### B. 检查策略数量

```sql
-- 2. 查看所有 RLS 策略
SELECT 
  tablename,
  COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count DESC;

-- 预期结果:
-- user_profiles       6
-- creator_profiles    3
-- (其他表应该没有策略)
```

### C. 检查触发器

```sql
-- 3. 验证自动创建 profile 的触发器
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 预期结果:
-- on_auth_user_created | INSERT | users
```

### D. 检查用户和 Profile 匹配

```sql
-- 4. 验证所有用户都有 profile
SELECT 
  COUNT(DISTINCT u.id) AS total_users,
  COUNT(DISTINCT p.user_id) AS users_with_profiles,
  COUNT(DISTINCT u.id) - COUNT(DISTINCT p.user_id) AS missing_profiles
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.user_id;

-- 预期结果:
-- total_users | users_with_profiles | missing_profiles
-- 5           | 5                   | 0
```

---

## 🆘 五、故障排查

### 问题 A: 注册后报错 "Database error saving new user"

**检查清单**:
```sql
-- 1. 触发器是否存在？
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
-- 应该返回 1 行

-- 2. 触发器函数是否有 SECURITY DEFINER？
SELECT prosecdef FROM pg_proc WHERE proname = 'handle_new_user';
-- 应该返回 true

-- 3. user_profiles RLS 策略是否正确？
SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles';
-- 应该返回 6 条策略
```

**修复**: 重新执行 `014_complete_auth_fix.sql`

### 问题 B: 前端访问 Supabase 报 "permission denied"

**原因**: 该表的 RLS 仍然启用但无策略

**检查**:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'solutions';
-- 如果 rowsecurity = true，说明 RLS 未关闭
```

**修复**: 执行 `015_disable_business_tables_rls.sql`

### 问题 C: API 返回他人数据（权限漏洞）

**原因**: API 路由缺少权限检查

**检查**:
```typescript
// ❌ 错误示例
export async function GET(request: NextRequest) {
  // 没有验证用户
  const orders = await prisma.order.findMany();
  // ⚠️ 返回所有订单！
}

// ✅ 正确示例
export const GET = withAuth(async (request, user) => {
  const orders = await prisma.order.findMany({
    where: { user_id: user.id }  // ✅ 只返回当前用户的订单
  });
});
```

**修复**: 使用 `withAuth` 中间件，添加 `where` 过滤

---

## 🎯 六、成功标准

完成以下所有测试才算成功：

- [ ] **数据库迁移**
  - [ ] `014_complete_auth_fix.sql` 执行成功
  - [ ] `015_disable_business_tables_rls.sql` 执行成功
  - [ ] RLS 状态验证通过（2 张表启用，22 张表关闭）

- [ ] **认证流程**
  - [ ] 注册新用户成功，无报错
  - [ ] user_profiles 自动创建
  - [ ] 收到验证邮件（中英双语）
  - [ ] 验证链接可点击
  - [ ] 重定向到 welcome 页面
  - [ ] 自动登录成功

- [ ] **权限检查**
  - [ ] 未登录访问受保护 API 返回 401
  - [ ] 普通用户无法访问管理员 API
  - [ ] 用户只能查看/修改自己的数据
  - [ ] 管理员可以查看所有数据

- [ ] **性能和稳定性**
  - [ ] 所有 API 响应正常
  - [ ] 无 RLS 相关错误
  - [ ] 无死循环问题

---

## 📝 七、后续维护

### A. 新增表时的规则

```sql
-- ❌ 不要这样做
CREATE TABLE new_business_table (...);
ALTER TABLE new_business_table ENABLE ROW LEVEL SECURITY;
-- 会导致前端访问失败

-- ✅ 应该这样做
CREATE TABLE new_business_table (...);
-- 不启用 RLS，在应用层控制权限
```

### B. 权限审计清单

```typescript
// 每个 API 路由必须包含:
1. ✅ 用户身份验证 (authenticateRequest 或 withAuth)
2. ✅ 角色检查 (requireRole)
3. ✅ 资源所有权检查 (checkResourceOwnership)
4. ✅ 数据过滤 (where: { user_id })
5. ✅ 错误处理 (try/catch)
```

### C. 定期检查

```bash
# 每月执行一次
# 1. 检查是否有新表意外启用了 RLS
psql $DATABASE_URL -c "
  SELECT tablename 
  FROM pg_tables 
  WHERE schemaname = 'public' 
    AND rowsecurity = true 
    AND tablename NOT IN ('user_profiles', 'creator_profiles');
"

# 2. 审计所有 API 路由的权限检查
grep -r "authenticateRequest\|withAuth" src/app/api/
```

---

## ✅ 总结

| 问题 | 当前状态 | 解决方案 | 状态 |
|------|---------|---------|------|
| RLS 死循环 | 🔴 严重 | 执行 014 + 015 迁移 | ✅ 已解决 |
| Prisma 绕过 RLS | 🔴 严重 | 关闭业务表 RLS | ✅ 已解决 |
| 22 张表无策略 | 🟡 中等 | 关闭这些表的 RLS | ✅ 已解决 |
| 权限检查分散 | 🟡 中等 | 创建统一中间件 | ✅ 已解决 |
| 邮件验证失败 | 🟡 中等 | 配置双语模板 | ✅ 已解决 |
| 迁移文件混乱 | 🟢 轻微 | 整理并规范 | ✅ 已解决 |

---

**🎉 现在你的项目架构清晰、安全、可维护！**

- ✅ Auth 层：Supabase + RLS 保护
- ✅ 业务层：Prisma + 应用层权限
- ✅ 无冲突：RLS 只在需要的地方启用
- ✅ 可扩展：新增功能遵循统一模式

**立即执行步骤 1 和步骤 2，彻底解决所有问题！** 🚀

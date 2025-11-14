# OpenAero 用户体系概览

## 📋 目录
1. [认证架构](#认证架构)
2. [用户数据模型](#用户数据模型)
3. [用户角色系统](#用户角色系统)
4. [用户状态管理](#用户状态管理)
5. [权限系统](#权限系统)
6. [认证流程](#认证流程)
7. [用户管理功能](#用户管理功能)

---

## 1. 认证架构

### 1.1 技术栈
- **认证服务**: Supabase Auth
- **数据库**: PostgreSQL (通过 Prisma ORM)
- **会话管理**: Supabase SSR (Server-Side Rendering)
- **存储**: Supabase Storage (头像等文件)

### 1.2 架构设计
```
┌─────────────────┐
│  Browser Client │
│  (React/Next.js)│
└────────┬────────┘
         │
         │ localStorage (浏览器端会话)
         │ cookies (服务器端会话)
         │
         ▼
┌─────────────────┐
│  Supabase Auth  │
│  (auth.users)   │
└────────┬────────┘
         │
         │ user_id (UUID)
         │
         ▼
┌─────────────────┐
│  PostgreSQL DB  │
│  (user_profiles)│
└─────────────────┘
```

### 1.3 数据分离
- **auth.users**: Supabase 管理的认证数据（邮箱、密码、手机号等）
- **user_profiles**: 应用层用户资料（角色、状态、个人资料等）
- **creator_profiles**: 创作者专属信息（认证状态、收益等）

---

## 2. 用户数据模型

### 2.1 auth.users (Supabase 管理)
```typescript
{
  id: string;              // UUID
  email: string;           // 邮箱地址
  phone?: string;          // 手机号码
  email_confirmed_at?: Date; // 邮箱验证时间
  created_at: Date;
  updated_at: Date;
}
```

### 2.2 user_profiles (应用层扩展)
```typescript
{
  id: string;              // UUID
  user_id: string;         // 关联 auth.users.id (UNIQUE)
  
  // 个人资料
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar?: string;         // 头像 URL
  bio?: string;
  
  // 角色与权限
  role: UserRole;          // 默认: USER
  permissions: string[];  // 额外权限数组
  
  // 状态管理
  status: UserStatus;      // 默认: ACTIVE
  is_blocked: boolean;     // 默认: false
  blocked_reason?: string;
  blocked_at?: Date;
  
  // 时间戳
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
}
```

### 2.3 creator_profiles (创作者资料)
```typescript
{
  id: string;
  user_id: string;         // 关联 user_profiles.user_id
  
  // 创作者信息
  company_name?: string;
  business_license?: string;
  id_card?: string;
  tax_number?: string;
  
  // 认证状态
  verification_status: VerificationStatus; // PENDING, APPROVED, REJECTED, EXPIRED
  verified_at?: Date;
  rejection_reason?: string;
  
  // 统计信息
  total_solutions: number;
  total_revenue: Decimal;
  rating?: Decimal;
  
  // 银行账户（收益结算）
  bank_name?: string;
  bank_account?: string;
  bank_account_name?: string;
}
```

---

## 3. 用户角色系统

### 3.1 角色定义

| 角色 | 代码 | 说明 | 默认权限 |
|------|------|------|----------|
| **普通用户** | `USER` | 可浏览和购买 | 浏览方案、创建订单 |
| **创作者** | `CREATOR` | 可上传方案 | 创建/更新/删除方案、查看收益 |
| **审核员** | `REVIEWER` | 可审核方案 | 审核方案、发布方案 |
| **工厂管理员** | `FACTORY_MANAGER` | 管理工厂和试产 | 管理工厂、更新订单状态 |
| **管理员** | `ADMIN` | 完全权限（除系统设置） | 所有功能权限 |
| **超级管理员** | `SUPER_ADMIN` | 系统最高权限 | 所有权限（包括系统设置） |

### 3.2 角色层级
```
SUPER_ADMIN (最高权限)
    ↓
ADMIN (管理权限)
    ↓
REVIEWER / FACTORY_MANAGER (专业角色)
    ↓
CREATOR (创作者)
    ↓
USER (普通用户)
```

### 3.3 角色变更流程
- **USER → CREATOR**: 通过创作者申请流程
- **USER → ADMIN/SUPER_ADMIN**: 仅管理员可操作
- **CREATOR → REVIEWER/FACTORY_MANAGER**: 仅管理员可操作

---

## 4. 用户状态管理

### 4.1 状态定义

| 状态 | 代码 | 说明 | 行为 |
|------|------|------|------|
| **活跃** | `ACTIVE` | 正常使用 | 可正常访问所有功能 |
| **未激活** | `INACTIVE` | 未激活账户 | 需要邮箱验证 |
| **暂停** | `SUSPENDED` | 被管理员暂停 | 无法登录，保留数据 |
| **已删除** | `DELETED` | 已删除账户 | 软删除，数据保留 |

### 4.2 状态变更
- **ACTIVE → SUSPENDED**: 管理员操作（可设置原因）
- **ACTIVE → DELETED**: 用户主动删除或管理员操作
- **SUSPENDED → ACTIVE**: 管理员恢复
- **INACTIVE → ACTIVE**: 邮箱验证后自动激活

### 4.3 状态检查
- 登录时检查用户状态
- API 路由中验证用户状态
- 前端路由保护（待完善）

---

## 5. 权限系统

### 5.1 权限结构
```typescript
// 权限标识符格式: resource:action
PERMISSIONS = {
  // 方案权限
  SOLUTIONS_READ: 'solutions:read',
  SOLUTIONS_CREATE: 'solutions:create',
  SOLUTIONS_UPDATE: 'solutions:update',
  SOLUTIONS_DELETE: 'solutions:delete',
  SOLUTIONS_REVIEW: 'solutions:review',
  SOLUTIONS_PUBLISH: 'solutions:publish',
  
  // 订单权限
  ORDERS_CREATE: 'orders:create',
  ORDERS_READ: 'orders:read',
  ORDERS_UPDATE: 'orders:update',
  ORDERS_CANCEL: 'orders:cancel',
  
  // 用户权限
  USERS_READ: 'users:read',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  USERS_MANAGE_ROLES: 'users:manage_roles',
  
  // 财务权限
  FINANCE_READ: 'finance:read',
  FINANCE_MANAGE: 'finance:manage',
  
  // 工厂权限
  FACTORIES_READ: 'factories:read',
  FACTORIES_CREATE: 'factories:create',
  FACTORIES_UPDATE: 'factories:update',
  
  // 系统设置
  SETTINGS_UPDATE: 'settings:update',
}
```

### 5.2 角色权限映射
- **USER**: 基础浏览和购买权限
- **CREATOR**: 方案管理 + 财务查看
- **REVIEWER**: 方案审核 + 发布
- **FACTORY_MANAGER**: 工厂和订单管理
- **ADMIN**: 除系统设置外的所有权限
- **SUPER_ADMIN**: 所有权限

### 5.3 权限检查
```typescript
// 检查用户角色
hasRole(user, 'ADMIN') || hasRole(user, ['ADMIN', 'SUPER_ADMIN'])

// 检查权限
hasPermission(user, 'solutions:create')
```

---

## 6. 认证流程

### 6.1 用户注册流程
```
1. 用户填写邮箱和密码
   ↓
2. 调用 Supabase Auth signUp
   ↓
3. Supabase 发送验证邮件
   ↓
4. 数据库触发器自动创建 user_profiles
   (role: USER, status: INACTIVE)
   ↓
5. 用户点击邮件链接验证
   ↓
6. 状态自动更新为 ACTIVE
```

### 6.2 用户登录流程
```
1. 用户输入邮箱和密码
   ↓
2. 调用 Supabase Auth signInWithPassword
   ↓
3. 验证邮箱是否已确认
   ↓
4. 检查用户状态（不能是 SUSPENDED 或 DELETED）
   ↓
5. 同步 session 到 cookies（用于 API 路由）
   ↓
6. 获取 user_profiles 信息
   ↓
7. 更新 last_login_at
   ↓
8. 返回用户信息和会话
```

### 6.3 会话管理
- **浏览器端**: localStorage 存储（`openaero-auth` key）
- **服务器端**: Cookies 存储（`sb-{project-ref}-auth-token`）
- **自动同步**: 登录时自动同步到 cookies
- **自动刷新**: Supabase 自动刷新过期 token

---

## 7. 用户管理功能

### 7.1 用户资料管理 ✅
- [x] 查看个人资料
- [x] 更新个人信息（名字、姓氏、显示名称、简介）
- [x] 上传/更新头像
- [x] 更新手机号码
- [x] 修改邮箱（需密码验证）
- [x] 修改密码（需当前密码）

### 7.2 邮箱管理 ✅
- [x] 邮箱验证（注册时）
- [x] 修改邮箱（需密码验证）
- [x] 重新发送验证邮件
- [x] 邮箱验证回调处理

### 7.3 密码管理 ✅
- [x] 忘记密码（发送重置邮件）
- [x] 重置密码（通过邮件链接）
- [x] 修改密码（需当前密码）
- [x] 密码强度验证

### 7.4 用户状态管理 ✅
- [x] 管理员修改用户状态
- [x] 状态变更审计日志
- [x] 状态变更通知（待实现邮件）

### 7.5 用户角色管理 ✅
- [x] 管理员修改用户角色
- [x] 角色变更审计日志
- [x] 权限检查中间件

### 7.6 管理员功能 ✅
- [x] 用户列表查看
- [x] 用户搜索和筛选
- [x] 用户详情查看
- [x] 批量操作（待完善）
- [x] 用户状态管理
- [x] 用户角色管理

---

## 8. 安全特性

### 8.1 Row Level Security (RLS)
- ✅ `user_profiles` 表启用 RLS
- ✅ 用户可以查看和更新自己的资料
- ✅ 管理员可以查看所有用户资料
- ✅ 使用 `SECURITY DEFINER` 函数避免递归

### 8.2 审计日志
- ✅ 所有用户操作记录到 `audit_logs` 表
- ✅ 记录操作类型、资源、IP 地址、User-Agent
- ✅ 支持成功/失败状态记录

### 8.3 数据验证
- ✅ Zod schema 验证（API 路由）
- ✅ 前端表单验证
- ✅ 密码强度检查
- ✅ 邮箱格式验证
- ✅ 手机号码格式验证

---

## 9. 当前实现状态

### ✅ 已完成
- [x] 用户注册和登录
- [x] 邮箱验证流程
- [x] 密码重置流程
- [x] 用户资料管理
- [x] 头像上传
- [x] 用户状态管理
- [x] 用户角色管理
- [x] 权限检查系统
- [x] 管理员用户管理
- [x] 审计日志系统

### ⚠️ 待完善
- [ ] 会话列表查看（用户查看自己的活跃会话）
- [ ] 会话终止功能（登出其他设备）
- [ ] 异常会话检测
- [ ] 邮箱变更通知邮件
- [ ] 状态变更通知邮件
- [ ] 多设备登录管理

---

## 10. API 端点

### 10.1 认证相关
- `POST /api/auth/sync-session` - 同步 session 到 cookies
- `GET /api/auth/callback` - 邮箱验证回调

### 10.2 用户资料
- `GET /api/users/me` - 获取当前用户信息
- `PATCH /api/users/me` - 更新当前用户信息
- `POST /api/users/avatar` - 上传头像
- `DELETE /api/users/avatar` - 删除头像

### 10.3 邮箱管理
- `POST /api/users/email/change` - 修改邮箱

### 10.4 密码管理
- `POST /api/users/password` - 修改密码

### 10.5 管理员功能
- `GET /api/admin/users` - 获取用户列表
- `GET /api/admin/users/[id]` - 获取用户详情
- `PATCH /api/admin/users/[id]/status` - 修改用户状态
- `PATCH /api/admin/users/[id]/role` - 修改用户角色
- `POST /api/admin/users/batch` - 批量操作

---

## 11. 相关文件

### 11.1 数据模型
- `prisma/schema.prisma` - Prisma 数据模型定义
- `supabase/migrations/001_create_user_profiles.sql` - 用户表迁移

### 11.2 认证服务
- `src/lib/auth/supabase-client.ts` - Supabase 客户端配置
- `src/lib/auth/auth-service.ts` - 认证服务类
- `src/contexts/AuthContext.tsx` - React 认证上下文

### 11.3 权限系统
- `src/lib/auth/permissions.ts` - 权限定义和检查

### 11.4 API 路由
- `src/app/api/users/me/route.ts` - 用户资料 API
- `src/app/api/users/avatar/route.ts` - 头像上传 API
- `src/app/api/admin/users/` - 管理员用户管理 API

---

## 12. 总结

当前用户体系基于 **Supabase Auth** 构建，采用**分离式架构**：
- **认证层**（Supabase Auth）：管理邮箱、密码、手机号
- **应用层**（user_profiles）：管理角色、状态、个人资料
- **扩展层**（creator_profiles）：管理创作者专属信息

系统支持**6种角色**和**4种状态**，具备完整的**权限控制**和**审计日志**功能。

**核心特性**：
- ✅ Email-only 认证（当前阶段）
- ✅ 邮箱验证流程
- ✅ 密码管理（忘记/重置/修改）
- ✅ 用户资料管理
- ✅ 头像上传
- ✅ 角色和权限管理
- ✅ 状态管理
- ✅ 管理员功能


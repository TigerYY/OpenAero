# OpenAero 用户认证系统指南

## 概述

本项目实现了一个完整的基于 Supabase 的多角色用户认证系统，支持邮箱验证、密码重置、角色管理等功能。

## 系统架构

### 技术栈
- **认证服务**: Supabase Auth
- **数据库**: PostgreSQL (Supabase)
- **邮件服务**: 腾讯企业邮箱 SMTP
- **后端框架**: Next.js 14 App Router
- **ORM**: Prisma

### 核心组件

1. **用户模型** (`prisma/schema.prisma`)
   - User - 用户基本信息
   - UserRole - 角色枚举(USER, CREATOR, REVIEWER, FACTORY_MANAGER, ADMIN, SUPER_ADMIN)
   - CreatorProfile - 创作者资料
   - UserAddress - 用户地址
   - UserSession - 会话日志
   - AuditLog - 审计日志

2. **认证服务** (`src/lib/auth/supabase-auth-service.ts`)
   - registerUser - 用户注册
   - loginUser - 用户登录
   - verifyEmail - 邮箱验证
   - requestPasswordReset - 请求重置密码
   - resetPassword - 重置密码
   - updateUserRole - 更新用户角色
   - getUserById - 获取用户信息
   - updateUserProfile - 更新用户信息

3. **邮件服务** (`src/lib/email/smtp-service.ts`)
   - sendVerificationEmail - 发送验证邮件
   - sendPasswordResetEmail - 发送重置密码邮件
   - sendWelcomeEmail - 发送欢迎邮件
   - sendRoleChangeEmail - 发送角色变更通知

4. **权限系统** (`src/lib/auth/permissions.ts`)
   - 基于角色的权限控制(RBAC)
   - 细粒度权限定义
   - 角色层级检查

5. **认证中间件** (`src/lib/auth/auth-middleware.ts`)
   - getCurrentUser - 获取当前用户
   - hasRole - 角色检查
   - hasPermission - 权限检查
   - withAuth - 认证包装器

## 用户角色

### 角色定义

| 角色 | 级别 | 描述 | 默认权限 |
|------|------|------|---------|
| USER | 1 | 普通用户 | 浏览方案、创建订单 |
| CREATOR | 2 | 创作者 | 上传方案、管理自己的方案 |
| REVIEWER | 3 | 审核员 | 审核方案 |
| FACTORY_MANAGER | 3 | 工厂管理员 | 管理工厂、处理试产订单 |
| ADMIN | 4 | 管理员 | 管理用户、内容、订单 |
| SUPER_ADMIN | 5 | 超级管理员 | 完全权限 |

### 角色升级流程

1. **普通用户 → 创作者**
   - 用户申请成为创作者
   - 提交认证资料(营业执照、身份证等)
   - 管理员审核通过后升级

2. **创作者 → 其他角色**
   - 由管理员手动分配

## API 路由

### 公开路由

```typescript
POST /api/auth/register          // 用户注册
POST /api/auth/login             // 用户登录
GET  /api/auth/verify-email      // 邮箱验证
POST /api/auth/forgot-password   // 忘记密码
POST /api/auth/reset-password    // 重置密码
POST /api/auth/logout            // 登出
```

### 受保护路由

```typescript
GET  /api/users/me               // 获取当前用户信息
PUT  /api/users/me               // 更新当前用户信息
```

### 管理员路由

```typescript
PATCH /api/admin/users/:id/role  // 更新用户角色
GET   /api/admin/users           // 获取用户列表
```

## 前端页面

### 认证页面

```
/register            - 用户注册
/login               - 用户登录
/forgot-password     - 忘记密码
/reset-password      - 重置密码
```

### 用户页面

```
/profile             - 个人中心
/profile/settings    - 账户设置
/creators/apply      - 申请成为创作者
```

## 环境配置

### 必需的环境变量

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_PROJECT_ID=your-project-id

# 数据库
DATABASE_URL=postgresql://...

# SMTP 邮件配置 (腾讯企业邮箱)
SMTP_HOST=smtp.exmail.qq.com
SMTP_PORT=465
SMTP_USER=support@openaero.cn
SMTP_PASS=zdM469e7q3ZU2gy7
SMTP_SENDER_EMAIL=support@openaero.cn
SMTP_SENDER_NAME=OpenAero
SMTP_SECURE=true

# 应用配置
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## 数据库迁移

### 初始化数据库

```bash
# 1. 生成 Prisma 客户端
npm run prisma:generate

# 2. 创建迁移
npx prisma migrate dev --name init

# 3. 应用迁移
npx prisma migrate deploy
```

### 创建初始管理员

```bash
# 使用 Prisma Studio
npx prisma studio

# 或使用脚本
node scripts/create-admin.js
```

## 使用示例

### 前端使用

```tsx
// 注册用户
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    firstName: '张',
    lastName: '三',
  }),
});

// 登录
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
  }),
});

// 获取当前用户
const response = await fetch('/api/users/me');
const { data: user } = await response.json();
```

### 后端 API 保护

```typescript
// 使用 withAuth 中间件
import { withAuth } from '@/lib/auth/auth-middleware';
import { UserRole } from '@prisma/client';

export const GET = withAuth(
  async (request, user) => {
    // user 已经过认证
    return NextResponse.json({ data: user });
  },
  {
    requiredRoles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  }
);
```

### 权限检查

```typescript
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

// 检查用户是否有权限
if (hasPermission(user, PERMISSIONS.SOLUTIONS_CREATE)) {
  // 允许创建方案
}
```

## 安全考虑

1. **密码安全**
   - 最少 8 个字符
   - Supabase 自动处理密码加密

2. **会话管理**
   - 使用 HttpOnly Cookie 存储 token
   - 自动过期机制
   - 支持多设备登录

3. **邮箱验证**
   - 注册后必须验证邮箱
   - 验证链接 24 小时有效

4. **密码重置**
   - 重置链接 1 小时有效
   - 一次性使用

5. **审计日志**
   - 记录所有重要操作
   - 包含 IP 地址和 User Agent

## 测试

### 测试账户

```
测试邮箱：contact@openaero.cn
测试密码：Pm8w9uNdgoaiqFzs
```

### 测试流程

1. **注册流程测试**
   ```bash
   # 1. 访问注册页面
   http://localhost:3000/register
   
   # 2. 填写信息并注册
   # 3. 检查邮箱收到验证邮件
   # 4. 点击验证链接
   # 5. 登录账户
   ```

2. **密码重置测试**
   ```bash
   # 1. 访问忘记密码页面
   http://localhost:3000/forgot-password
   
   # 2. 输入邮箱
   # 3. 检查邮箱收到重置邮件
   # 4. 点击重置链接
   # 5. 设置新密码
   ```

3. **角色管理测试**
   ```bash
   # 1. 以管理员身份登录
   # 2. 访问用户管理页面
   # 3. 选择用户并更新角色
   # 4. 验证角色权限生效
   ```

## 常见问题

### Q: 无法收到验证邮件？
A: 
1. 检查垃圾邮件文件夹
2. 验证 SMTP 配置是否正确
3. 检查邮箱服务器日志

### Q: 登录后立即被登出？
A: 
1. 检查 cookie 设置
2. 验证 session 过期时间
3. 检查浏览器是否禁用 cookie

### Q: 如何创建第一个管理员？
A: 
1. 先注册一个普通用户
2. 直接在数据库中更新该用户的 role 为 SUPER_ADMIN
3. 或使用提供的脚本创建

## 后续优化

- [ ] 添加双因素认证(2FA)
- [ ] 支持 OAuth 登录(Google, GitHub)
- [ ] 实现记住登录功能
- [ ] 添加账户锁定机制(防暴力破解)
- [ ] 实现更细粒度的权限控制
- [ ] 添加用户行为分析
- [ ] 实现 WebAuthn/FIDO2 支持

## 联系方式

如有问题，请联系：
- 邮箱: support@openaero.cn
- 技术支持: contact@openaero.cn

# Quick Start Guide: User Authentication System

## 概述

本指南帮助开发人员快速理解和实现用户认证系统。系统基于Next.js 14+和Prisma ORM构建，提供完整的用户注册、登录、会话管理功能。

## 环境要求

- Node.js 18+ (LTS)
- PostgreSQL 15+
- Redis 7+ (用于会话管理和速率限制)

## 快速开始

### 1. 环境配置

```bash
# 克隆项目
git clone https://github.com/openaero/openaero.web.git
cd openaero.web

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 文件，配置数据库和邮件服务
```

### 2. 数据库设置

```bash
# 生成Prisma客户端
npx prisma generate

# 运行数据库迁移
npx prisma db push

# 可选：填充测试数据
npx prisma db seed
```

### 3. 启动开发服务器

```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

## 核心功能实现

### 用户注册流程

```typescript
// 页面：/auth/register
// API：POST /api/auth/register

// 1. 用户填写注册表单（邮箱、密码、姓名）
// 2. 前端验证表单数据
// 3. 调用注册API
// 4. 创建用户记录（邮箱未验证状态）
// 5. 发送验证邮件
// 6. 显示成功消息，提示用户检查邮箱
```

### 邮箱验证流程

```typescript
// 页面：/auth/verify-email
// API：POST /api/auth/verify-email

// 1. 用户点击邮件中的验证链接
// 2. 链接包含验证令牌
// 3. 调用验证API验证令牌
// 4. 更新用户邮箱验证状态
// 5. 自动登录用户或重定向到登录页面
```

### 用户登录流程

```typescript
// 页面：/auth/login
// API：POST /api/auth/login

// 1. 用户输入邮箱和密码
// 2. 前端验证输入格式
// 3. 调用登录API
// 4. 验证邮箱和密码
// 5. 检查邮箱验证状态
// 6. 创建会话记录
// 7. 返回用户信息和会话令牌
// 8. 重定向到用户仪表板
```

### 密码重置流程

```typescript
// 页面：/auth/forgot-password → /auth/reset-password
// API：POST /api/auth/forgot-password → POST /api/auth/reset-password

// 1. 用户输入邮箱请求密码重置
// 2. 发送包含重置令牌的邮件
// 3. 用户点击邮件链接进入重置页面
// 4. 输入新密码并提交
// 5. 验证重置令牌有效性
// 6. 更新密码并终止所有活跃会话
// 7. 重定向到登录页面
```

## 关键组件

### NextAuth.js 配置

```typescript
// lib/auth.ts
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      // 邮箱密码认证提供者
    }),
  ],
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24小时
  },
  // ... 其他配置
};
```

### 认证中间件

```typescript
// middleware.ts
export default withAuth(
  function middleware(req) {
    // 认证和授权逻辑
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // 授权回调逻辑
      },
    },
  }
);
```

### 密码哈希工具

```typescript
// lib/auth-utils.ts
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
```

## 测试指南

### 单元测试

```bash
# 运行认证相关单元测试
npm test -- auth

# 测试覆盖特定文件
npm test -- src/lib/auth.test.ts
```

### 集成测试

```bash
# 运行认证流程集成测试
npm run test:integration -- auth
```

### E2E测试

```bash
# 运行完整的用户认证E2E测试
npm run test:e2e -- auth-flow
```

## 部署说明

### 生产环境配置

1. **环境变量配置**
   ```bash
   DATABASE_URL=生产数据库连接
   REDIS_URL=生产Redis连接
   SMTP_CONFIG=生产邮件服务配置
   NEXTAUTH_SECRET=强密钥
   NEXTAUTH_URL=生产域名
   ```

2. **安全配置**
   - 启用HTTPS
   - 配置安全头
   - 设置适当的CORS策略

3. **监控和日志**
   - 集成Prometheus监控
   - 配置错误追踪
   - 设置日志聚合

## 故障排除

### 常见问题

1. **数据库连接错误**
   - 检查DATABASE_URL配置
   - 验证数据库服务状态
   - 检查网络连接

2. **邮件发送失败**
   - 检查SMTP配置
   - 验证邮件服务状态
   - 检查垃圾邮件设置

3. **会话问题**
   - 检查Redis连接
   - 验证会话配置
   - 清除浏览器缓存

### 调试技巧

```typescript
// 启用详细日志
const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === 'development',
  // ...
};

// 检查会话状态
console.log('Session:', await getServerSession(authOptions));
```

## 相关文档

- [API文档](./contracts/auth-api.yaml)
- [数据模型](./data-model.md)
- [研究文档](./research.md)
- [完整规范](./spec.md)
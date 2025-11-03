# 认证系统使用指南

## 概述

OpenAero认证系统是一个完整的企业级用户认证解决方案，提供安全的用户注册、登录、邮箱验证、密码重置等功能，并集成了强大的管理员系统和安全中间件。

## 快速开始

### 1. 用户注册流程

```typescript
// 注册请求示例
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!',
    name: '张三'
  })
});
```

**注册流程：**
1. 用户填写注册信息
2. 系统验证密码强度（8+字符，包含大小写字母、数字、特殊字符）
3. 发送邮箱验证邮件
4. 用户点击验证链接完成注册

### 2. 用户登录流程

```typescript
// 登录请求示例
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!'
  })
});
```

**登录流程：**
1. 用户输入邮箱和密码
2. 系统验证凭据
3. 生成JWT令牌（24小时有效期）
4. 设置安全Cookie

### 3. 密码重置流程

```typescript
// 忘记密码请求
await fetch('/api/auth/forgot-password', {
  method: 'POST',
  body: JSON.stringify({ email: 'user@example.com' })
});

// 重置密码请求
await fetch('/api/auth/reset-password', {
  method: 'POST',
  body: JSON.stringify({ 
    token: 'reset-token',
    password: 'NewPassword123!'
  })
});
```

## API端点参考

### 认证API

| 端点 | 方法 | 描述 | 权限 |
|------|------|------|------|
| `/api/auth/register` | POST | 用户注册 | 公开 |
| `/api/auth/login` | POST | 用户登录 | 公开 |
| `/api/auth/logout` | POST | 用户登出 | 需要登录 |
| `/api/auth/verify-email` | POST | 邮箱验证 | 公开 |
| `/api/auth/resend-verification` | POST | 重新发送验证邮件 | 需要登录 |
| `/api/auth/forgot-password` | POST | 忘记密码 | 公开 |
| `/api/auth/reset-password` | POST | 重置密码 | 公开 |
| `/api/auth/session` | GET | 获取会话信息 | 需要登录 |

### 管理员API

| 端点 | 方法 | 描述 | 权限 |
|------|------|------|------|
| `/api/admin/users` | GET/POST | 用户管理 | 管理员 |
| `/api/admin/permissions` | GET/POST | 权限管理 | 管理员 |
| `/api/admin/audit-logs` | GET | 审计日志 | 管理员 |
| `/api/admin/dashboard/stats` | GET | 仪表板统计 | 管理员 |

## 安全中间件

### 1. 认证中间件

```typescript
import { authenticateToken } from '@/backend/auth/auth.middleware';

// 在API路由中使用
const user = await authenticateToken(request);
if (!user) {
  return NextResponse.json({ error: '未授权' }, { status: 401 });
}
```

### 2. 权限中间件

```typescript
import { requireAdmin, requireRole } from '@/backend/auth/auth.middleware';

// 管理员权限
const admin = await requireAdmin(request);

// 自定义角色权限
const creator = await requireRole(['creator', 'admin'])(request);
```

### 3. 速率限制中间件

```typescript
import { rateLimit } from '@/backend/middleware/rateLimit';

// 应用速率限制
const limited = await rateLimit(request, {
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10 // 最多10次请求
});
```

## 前端组件使用

### 1. AuthProvider

```tsx
import { AuthProvider } from '@/components/providers/AuthProvider';

function App() {
  return (
    <AuthProvider>
      <YourApp />
    </AuthProvider>
  );
}
```

### 2. AuthGuard

```tsx
import { AuthGuard } from '@/components/auth/AuthGuard';

function ProtectedPage() {
  return (
    <AuthGuard requiredRole="admin">
      <AdminDashboard />
    </AuthGuard>
  );
}
```

### 3. useAuth Hook

```tsx
import { useAuth } from '@/hooks/useAuth';

function UserProfile() {
  const { user, login, logout, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <div>请先登录</div>;
  }
  
  return <div>欢迎, {user.name}</div>;
}
```

## 配置说明

### 环境变量

```env
# 数据库
DATABASE_URL="postgresql://user:pass@localhost:5432/openaero"

# JWT配置
JWT_SECRET="your-jwt-secret-key"
JWT_EXPIRES_IN="24h"

# 邮件服务
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# 安全配置
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 密码策略

- **最小长度**: 8个字符
- **复杂度要求**: 必须包含大小写字母、数字、特殊字符
- **哈希算法**: bcrypt (12轮)
- **会话超时**: 24小时

## 错误处理

### 常见错误代码

| 错误码 | 描述 | 解决方案 |
|--------|------|----------|
| 400 | 请求参数错误 | 检查输入数据格式 |
| 401 | 未授权 | 检查登录状态或令牌 |
| 403 | 权限不足 | 检查用户角色权限 |
| 429 | 请求过于频繁 | 等待一段时间后重试 |
| 500 | 服务器内部错误 | 联系技术支持 |

### 错误响应格式

```json
{
  "error": "错误描述",
  "code": "ERROR_CODE",
  "details": "详细错误信息"
}
```

## 测试指南

### 运行测试

```bash
# 运行所有认证测试
npm test -- auth

# 运行特定测试文件
npm test -- src/__tests__/auth/auth.test.ts

# 运行集成测试
npm test -- src/__tests__/integration/auth-integration.test.ts
```

### 测试覆盖率

```bash
# 生成测试覆盖率报告
npm run test:coverage

# 查看认证系统覆盖率
open coverage/lcov-report/src/__tests__/auth/index.html
```

## 部署指南

### 1. 生产环境配置

```bash
# 设置生产环境变量
cp .env.production .env.local

# 生成JWT密钥
openssl rand -base64 32

# 配置邮件服务
# 使用SendGrid、Mailgun或AWS SES
```

### 2. 安全检查清单

- [ ] JWT密钥已设置且安全
- [ ] 数据库连接使用SSL
- [ ] 邮件服务配置正确
- [ ] 速率限制已启用
- [ ] HTTPS强制启用
- [ ] 安全头已配置

## 故障排除

### 常见问题

**Q: 用户注册失败**
A: 检查邮箱是否已存在，密码是否符合强度要求

**Q: 登录后会话丢失**
A: 检查Cookie设置和域名配置

**Q: 邮件发送失败**
A: 检查SMTP配置和网络连接

**Q: 权限验证失败**
A: 检查用户角色和权限设置

### 日志分析

认证系统会记录详细的审计日志，可以在管理员后台查看：
- 登录/登出记录
- 权限变更记录
- 安全事件记录

## 支持与联系

如有问题，请联系：
- **技术支持**: tech-support@openaero.com
- **安全团队**: security@openaero.com
- **文档反馈**: docs@openaero.com

---

**文档版本**: 1.0.0  
**最后更新**: 2025-11-03  
**维护团队**: OpenAero技术团队
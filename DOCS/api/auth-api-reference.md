# 认证API参考文档

## 概述

本文档详细描述了OpenAero认证系统的所有API端点，包括请求参数、响应格式、错误代码和使用示例。

## 基础信息

### 基础URL
```
https://api.openaero.com/api
```

### 认证方式
- **JWT Bearer Token**: 需要在请求头中携带 `Authorization: Bearer <token>`
- **Cookie**: 自动管理会话Cookie

### 通用响应格式

**成功响应:**
```json
{
  "success": true,
  "data": {},
  "message": "操作成功"
}
```

**错误响应:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": "详细错误信息"
  }
}
```

## 认证API端点

### 1. 用户注册

**端点:** `POST /api/auth/register`

**描述:** 创建新用户账户并发送邮箱验证邮件。

**请求参数:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "张三",
  "role": "client" // 可选，默认: client
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid-string",
    "email": "user@example.com",
    "name": "张三",
    "emailVerified": false,
    "message": "注册成功，请检查邮箱完成验证"
  }
}
```

**错误代码:**
- `EMAIL_ALREADY_EXISTS`: 邮箱已存在
- `INVALID_PASSWORD`: 密码不符合强度要求
- `INVALID_EMAIL`: 邮箱格式不正确

### 2. 邮箱验证

**端点:** `POST /api/auth/verify-email`

**描述:** 验证用户邮箱地址。

**请求参数:**
```json
{
  "token": "verification-token-from-email"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid-string",
    "email": "user@example.com",
    "emailVerified": true,
    "message": "邮箱验证成功"
  }
}
```

**错误代码:**
- `INVALID_TOKEN`: 验证令牌无效或已过期
- `EMAIL_ALREADY_VERIFIED`: 邮箱已验证

### 3. 重新发送验证邮件

**端点:** `POST /api/auth/resend-verification`

**描述:** 重新发送邮箱验证邮件。

**请求参数:**
```json
{
  "email": "user@example.com"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "message": "验证邮件已发送"
  }
}
```

### 4. 用户登录

**端点:** `POST /api/auth/login`

**描述:** 用户登录并获取JWT令牌。

**请求参数:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-string",
      "email": "user@example.com",
      "name": "张三",
      "role": "client",
      "emailVerified": true
    },
    "token": "jwt-token-string",
    "expiresIn": 86400
  }
}
```

**错误代码:**
- `INVALID_CREDENTIALS`: 邮箱或密码错误
- `EMAIL_NOT_VERIFIED`: 邮箱未验证
- `ACCOUNT_LOCKED`: 账户被锁定

### 5. 忘记密码

**端点:** `POST /api/auth/forgot-password`

**描述:** 发送密码重置邮件。

**请求参数:**
```json
{
  "email": "user@example.com"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "message": "密码重置邮件已发送"
  }
}
```

### 6. 重置密码

**端点:** `POST /api/auth/reset-password`

**描述:** 使用重置令牌设置新密码。

**请求参数:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecurePassword123!"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "message": "密码重置成功"
  }
}
```

**错误代码:**
- `INVALID_TOKEN`: 重置令牌无效或已过期
- `PASSWORD_SAME_AS_OLD`: 新密码不能与旧密码相同

### 7. 获取会话信息

**端点:** `GET /api/auth/session`

**描述:** 获取当前登录用户的会话信息。

**请求头:**
```
Authorization: Bearer <jwt-token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-string",
      "email": "user@example.com",
      "name": "张三",
      "role": "client",
      "emailVerified": true,
      "createdAt": "2025-11-03T10:00:00Z"
    },
    "session": {
      "expiresAt": "2025-11-04T10:00:00Z",
      "lastActive": "2025-11-03T10:30:00Z"
    }
  }
}
```

### 8. 用户登出

**端点:** `POST /api/auth/logout`

**描述:** 用户登出并清除会话。

**请求头:**
```
Authorization: Bearer <jwt-token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "message": "登出成功"
  }
}
```

## 管理员API端点

### 1. 获取用户列表

**端点:** `GET /api/admin/users`

**描述:** 获取用户列表（仅管理员）。

**查询参数:**
- `page`: 页码（默认: 1）
- `limit`: 每页数量（默认: 20）
- `search`: 搜索关键词（邮箱或姓名）
- `role`: 角色筛选
- `verified`: 邮箱验证状态筛选

**响应:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid-string",
        "email": "user@example.com",
        "name": "张三",
        "role": "client",
        "emailVerified": true,
        "createdAt": "2025-11-03T10:00:00Z",
        "lastLogin": "2025-11-03T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

### 2. 更新用户信息

**端点:** `PUT /api/admin/users/:id`

**描述:** 更新用户信息（仅管理员）。

**请求参数:**
```json
{
  "name": "新姓名",
  "role": "admin",
  "emailVerified": true
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-string",
      "email": "user@example.com",
      "name": "新姓名",
      "role": "admin",
      "emailVerified": true
    },
    "message": "用户信息更新成功"
  }
}
```

### 3. 获取权限列表

**端点:** `GET /api/admin/permissions`

**描述:** 获取系统权限列表（仅管理员）。

**响应:**
```json
{
  "success": true,
  "data": {
    "permissions": [
      {
        "id": "permission-id",
        "name": "用户管理",
        "description": "管理用户账户和权限",
        "level": 90,
        "resourceType": "user",
        "actionType": "manage"
      }
    ]
  }
}
```

### 4. 获取审计日志

**端点:** `GET /api/admin/audit-logs`

**描述:** 获取系统审计日志（仅管理员）。

**查询参数:**
- `page`: 页码（默认: 1）
- `limit`: 每页数量（默认: 50）
- `actionType`: 操作类型筛选
- `userId`: 用户ID筛选
- `startDate`: 开始日期
- `endDate`: 结束日期

**响应:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log-id",
        "userId": "user-id",
        "userEmail": "user@example.com",
        "actionType": "LOGIN",
        "resourceType": "auth",
        "resourceId": "session-id",
        "details": "用户登录成功",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "timestamp": "2025-11-03T10:30:00Z",
        "success": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1000,
      "pages": 20
    }
  }
}
```

## 安全中间件API

### 速率限制信息

所有API端点都包含速率限制信息在响应头中：

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1635930000
```

### 错误响应示例

**速率限制错误:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "请求过于频繁，请稍后重试",
    "details": "请在15分钟后重试"
  }
}
```

**权限不足错误:**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "权限不足",
    "details": "需要管理员权限"
  }
}
```

## 使用示例

### JavaScript/TypeScript

```typescript
import { useAuth } from '@/hooks/useAuth';

const AuthExample = () => {
  const { login, user, isAuthenticated } = useAuth();

  const handleLogin = async () => {
    try {
      await login('user@example.com', 'password123');
      console.log('登录成功:', user);
    } catch (error) {
      console.error('登录失败:', error);
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <div>欢迎, {user.name}</div>
      ) : (
        <button onClick={handleLogin}>登录</button>
      )}
    </div>
  );
};
```

### cURL示例

**用户登录:**
```bash
curl -X POST https://api.openaero.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

**获取会话信息:**
```bash
curl -X GET https://api.openaero.com/api/auth/session \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 错误代码参考

| 错误代码 | 描述 | HTTP状态码 |
|----------|------|------------|
| `INVALID_CREDENTIALS` | 邮箱或密码错误 | 401 |
| `EMAIL_NOT_VERIFIED` | 邮箱未验证 | 403 |
| `ACCOUNT_LOCKED` | 账户被锁定 | 403 |
| `INVALID_TOKEN` | 令牌无效 | 401 |
| `TOKEN_EXPIRED` | 令牌过期 | 401 |
| `RATE_LIMIT_EXCEEDED` | 请求过于频繁 | 429 |
| `INSUFFICIENT_PERMISSIONS` | 权限不足 | 403 |
| `VALIDATION_ERROR` | 参数验证失败 | 400 |
| `INTERNAL_SERVER_ERROR` | 服务器内部错误 | 500 |

---

**文档版本**: 1.0.0  
**最后更新**: 2025-11-03  
**维护团队**: OpenAero技术团队
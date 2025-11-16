# 📡 OpenAero API 文档

**版本**: 1.0.0  
**最后更新**: 2025-01-16  
**Base URL**: `https://openaero.cn/api` (生产环境)  
**Base URL**: `http://localhost:3000/api` (开发环境)

---

## 📋 目录

1. [API 概述](#api-概述)
2. [认证与授权](#认证与授权)
3. [请求格式](#请求格式)
4. [响应格式](#响应格式)
5. [错误处理](#错误处理)
6. [API 端点](#api-端点)
7. [速率限制](#速率限制)
8. [版本管理](#版本管理)

---

## 1. API 概述

### 1.1 设计原则

- ✅ **RESTful 设计**: 遵循 REST 架构规范
- ✅ **统一响应**: 标准化的响应格式
- ✅ **类型安全**: Zod schema 验证
- ✅ **安全认证**: JWT Token 机制
- ✅ **完善错误**: 详细的错误信息
- ✅ **分页支持**: 统一的分页参数

### 1.2 协议

- **传输协议**: HTTPS (TLS 1.2+)
- **请求方法**: GET, POST, PUT, PATCH, DELETE
- **内容类型**: `application/json`
- **字符编码**: UTF-8

---

## 2. 认证与授权

### 2.1 认证方式

OpenAero API 使用 **JWT (JSON Web Token)** 进行认证，基于 Supabase Auth。

#### 获取 Token

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

**响应**:
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "session": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "v1.MRjz...",
      "expires_at": 1705401600
    },
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com"
    }
  }
}
```

#### 使用 Token

在所有需要认证的请求中，在 Header 中包含 Token：

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2.2 角色权限 (RBAC)

| 角色 | 说明 | 权限 |
|------|------|------|
| `USER` | 普通用户 | 浏览方案、下单、评论 |
| `CREATOR` | 创作者 | USER 权限 + 创建/管理方案 |
| `REVIEWER` | 审核员 | 审核方案 |
| `FACTORY_MANAGER` | 工厂管理员 | 管理样品订单 |
| `ADMIN` | 管理员 | 平台管理 |
| `SUPER_ADMIN` | 超级管理员 | 所有权限 |

---

## 3. 请求格式

### 3.1 GET 请求

查询参数通过 URL Query String 传递：

```bash
GET /api/solutions?page=1&limit=10&status=PUBLISHED&category=FPV
```

### 3.2 POST/PUT/PATCH 请求

请求体使用 JSON 格式：

```bash
POST /api/solutions
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "高性能穿越机方案",
  "description": "适用于电影跟拍的超静音穿越机",
  "category": "FPV",
  "price": 2999.99,
  "features": ["低噪音", "高稳定性", "长续航"],
  "specs": {
    "weight": 580,
    "flight_time": 25,
    "max_speed": 120
  }
}
```

### 3.3 文件上传

使用 `multipart/form-data` 格式：

```bash
POST /api/solutions/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

------WebKitFormBoundary...
Content-Disposition: form-data; name="file"; filename="drone.jpg"
Content-Type: image/jpeg

(binary data)
------WebKitFormBoundary...--
```

---

## 4. 响应格式

### 4.1 成功响应

所有成功响应遵循统一格式：

```json
{
  "success": true,
  "message": "操作成功",
  "data": {
    // 响应数据
  }
}
```

### 4.2 分页响应

包含分页信息的列表数据：

```json
{
  "success": true,
  "message": "获取方案列表成功",
  "data": [
    // 数据项
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 156,
    "totalPages": 16
  }
}
```

### 4.3 HTTP 状态码

| 状态码 | 说明 | 使用场景 |
|--------|------|---------|
| `200` | OK | 成功 (GET, PUT, PATCH) |
| `201` | Created | 资源创建成功 (POST) |
| `204` | No Content | 删除成功 (DELETE) |
| `400` | Bad Request | 请求参数错误 |
| `401` | Unauthorized | 未认证 |
| `403` | Forbidden | 无权限 |
| `404` | Not Found | 资源不存在 |
| `409` | Conflict | 资源冲突 |
| `422` | Unprocessable Entity | 数据验证失败 |
| `429` | Too Many Requests | 超过速率限制 |
| `500` | Internal Server Error | 服务器错误 |

---

## 5. 错误处理

### 5.1 错误响应格式

```json
{
  "success": false,
  "error": "错误描述",
  "code": 400,
  "details": {
    // 详细错误信息（可选）
  }
}
```

### 5.2 验证错误

```json
{
  "success": false,
  "error": "数据验证失败",
  "code": 422,
  "details": {
    "errors": [
      {
        "path": ["title"],
        "message": "标题不能为空"
      },
      {
        "path": ["price"],
        "message": "价格必须大于0"
      }
    ]
  }
}
```

### 5.3 常见错误代码

| 错误码 | 说明 |
|--------|------|
| `AUTH_REQUIRED` | 需要认证 |
| `AUTH_INVALID_TOKEN` | Token 无效 |
| `AUTH_TOKEN_EXPIRED` | Token 已过期 |
| `PERMISSION_DENIED` | 权限不足 |
| `VALIDATION_ERROR` | 数据验证失败 |
| `RESOURCE_NOT_FOUND` | 资源不存在 |
| `RESOURCE_CONFLICT` | 资源冲突 |
| `RATE_LIMIT_EXCEEDED` | 超过速率限制 |

---

## 6. API 端点

### 6.1 认证 (Auth)

#### 登录

```http
POST /api/auth/login
```

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

**响应**: `200 OK`
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "session": {
      "access_token": "eyJ...",
      "refresh_token": "v1.MRj...",
      "expires_at": 1705401600
    },
    "user": {
      "id": "550e8400-...",
      "email": "user@example.com"
    }
  }
}
```

---

#### 注册

```http
POST /api/auth/register
```

**请求体**:
```json
{
  "email": "newuser@example.com",
  "password": "secure-password",
  "firstName": "张",
  "lastName": "三"
}
```

**响应**: `201 Created`

---

#### 登出

```http
POST /api/auth/logout
Authorization: Bearer <token>
```

**响应**: `200 OK`

---

#### 刷新 Token

```http
POST /api/auth/refresh
```

**请求体**:
```json
{
  "refresh_token": "v1.MRjz..."
}
```

---

#### 重置密码请求

```http
POST /api/auth/password/reset
```

**请求体**:
```json
{
  "email": "user@example.com"
}
```

---

### 6.2 用户 (Users)

#### 获取当前用户信息

```http
GET /api/users/me
Authorization: Bearer <token>
```

**响应**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "550e8400-...",
    "email": "user@example.com",
    "firstName": "张",
    "lastName": "三",
    "displayName": "张三",
    "avatar": "https://...",
    "roles": ["USER", "CREATOR"],
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

---

#### 更新用户资料

```http
PATCH /api/users/me
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "firstName": "张",
  "lastName": "三",
  "displayName": "张三",
  "bio": "资深无人机爱好者"
}
```

---

#### 更新头像

```http
PUT /api/users/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**请求体**: Form Data with `file` field

---

#### 修改密码

```http
PUT /api/users/password
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "currentPassword": "old-password",
  "newPassword": "new-secure-password"
}
```

---

### 6.3 方案 (Solutions)

#### 获取方案列表

```http
GET /api/solutions?page=1&limit=10&status=PUBLISHED&category=FPV&search=穿越机
```

**查询参数**:
- `page` (int): 页码，默认 1
- `limit` (int): 每页数量，默认 10，最大 100
- `status` (string): 状态筛选 (`PUBLISHED`, `DRAFT`, 等)
- `category` (string): 分类筛选
- `search` (string): 搜索关键词

**响应**: `200 OK`
```json
{
  "success": true,
  "message": "获取方案列表成功",
  "data": [
    {
      "id": "clu123abc...",
      "title": "高性能穿越机方案",
      "description": "适用于电影跟拍...",
      "category": "FPV",
      "status": "PUBLISHED",
      "price": 2999.99,
      "images": ["https://..."],
      "tags": ["低噪音", "高稳定性"],
      "creatorId": "clu456def...",
      "creatorName": "张工",
      "reviewCount": 15,
      "rating": 4.8,
      "createdAt": "2025-01-01T00:00:00Z",
      "publishedAt": "2025-01-05T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 156,
    "totalPages": 16
  }
}
```

---

#### 获取方案详情

```http
GET /api/solutions/{id}
```

**响应**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "clu123abc...",
    "title": "高性能穿越机方案",
    "description": "详细描述...",
    "category": "FPV",
    "status": "PUBLISHED",
    "price": 2999.99,
    "version": 2,
    "images": ["https://..."],
    "features": ["低噪音", "高稳定性", "长续航"],
    "tags": ["FPV", "穿越机"],
    "specs": {
      "weight": 580,
      "flightTime": 25,
      "maxSpeed": 120
    },
    "bom": [
      {
        "name": "电机",
        "model": "2306-2400KV",
        "quantity": 4,
        "unitPrice": 89.00
      }
    ],
    "creator": {
      "id": "clu456def...",
      "name": "张工",
      "avatar": "https://...",
      "bio": "资深FPV玩家"
    },
    "stats": {
      "views": 1234,
      "favorites": 56,
      "reviews": 15,
      "rating": 4.8,
      "sales": 23
    },
    "files": [
      {
        "id": "file123...",
        "type": "CAD_FILE",
        "name": "frame.step",
        "url": "https://...",
        "size": 2048000
      }
    ],
    "createdAt": "2025-01-01T00:00:00Z",
    "publishedAt": "2025-01-05T00:00:00Z"
  }
}
```

---

#### 创建方案

```http
POST /api/solutions
Authorization: Bearer <token>
```

**权限**: `CREATOR`, `ADMIN`

**请求体**:
```json
{
  "title": "高性能穿越机方案",
  "description": "适用于电影跟拍的超静音穿越机",
  "category": "FPV",
  "price": 2999.99,
  "features": ["低噪音", "高稳定性", "长续航"],
  "images": ["https://..."],
  "specs": {
    "weight": 580,
    "flightTime": 25,
    "maxSpeed": 120
  },
  "bom": [
    {
      "name": "电机",
      "model": "2306-2400KV",
      "quantity": 4,
      "unitPrice": 89.00
    }
  ]
}
```

**响应**: `201 Created`

---

#### 更新方案

```http
PUT /api/solutions/{id}
Authorization: Bearer <token>
```

**权限**: 创作者本人或 `ADMIN`

---

#### 提交审核

```http
POST /api/solutions/{id}/submit
Authorization: Bearer <token>
```

**权限**: 创作者本人

**响应**: `200 OK`

---

#### 发布方案

```http
POST /api/solutions/{id}/publish
Authorization: Bearer <token>
```

**权限**: `ADMIN`, `REVIEWER`

---

#### 删除方案

```http
DELETE /api/solutions/{id}
Authorization: Bearer <token>
```

**权限**: 创作者本人或 `ADMIN`

**响应**: `204 No Content`

---

### 6.4 创作者 (Creators)

#### 申请成为创作者

```http
POST /api/creators/apply
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "bio": "我是一名资深的FPV穿越机玩家...",
  "website": "https://mywebsite.com",
  "experience": "5年无人机开发经验...",
  "specialties": ["FPV", "穿越机", "航拍"],
  "portfolio": ["https://project1.com", "https://project2.com"]
}
```

**响应**: `201 Created`
```json
{
  "success": true,
  "message": "创作者申请提交成功，我们将在3个工作日内审核您的申请",
  "data": {
    "applicationId": "app123...",
    "status": "PENDING",
    "submittedAt": "2025-01-16T10:00:00Z"
  }
}
```

---

#### 获取创作者仪表板数据

```http
GET /api/creators/dashboard/stats
Authorization: Bearer <token>
```

**权限**: `CREATOR`

**响应**: `200 OK`
```json
{
  "success": true,
  "data": {
    "totalSolutions": 12,
    "publishedSolutions": 8,
    "pendingSolutions": 2,
    "totalRevenue": 45678.90,
    "availableRevenue": 12345.67,
    "totalSales": 156,
    "totalViews": 8923,
    "averageRating": 4.7
  }
}
```

---

#### 获取创作者方案列表

```http
GET /api/creators/solutions?page=1&limit=10&status=all
Authorization: Bearer <token>
```

**权限**: `CREATOR`

---

### 6.5 订单 (Orders)

#### 获取订单列表

```http
GET /api/orders?page=1&limit=10&status=PENDING
Authorization: Bearer <token>
```

**查询参数**:
- `page` (int): 页码
- `limit` (int): 每页数量
- `status` (string): 状态筛选
- `search` (string): 搜索

**响应**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "ord123...",
      "orderNumber": "ORD-20250116-001",
      "status": "PENDING",
      "total": 5999.98,
      "items": [
        {
          "solutionId": "sol123...",
          "title": "高性能穿越机方案",
          "quantity": 2,
          "price": 2999.99
        }
      ],
      "createdAt": "2025-01-16T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

---

#### 获取订单详情

```http
GET /api/orders/{id}
Authorization: Bearer <token>
```

**响应**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "ord123...",
    "orderNumber": "ORD-20250116-001",
    "status": "PENDING",
    "total": 5999.98,
    "items": [
      {
        "id": "item123...",
        "solutionId": "sol123...",
        "title": "高性能穿越机方案",
        "quantity": 2,
        "unitPrice": 2999.99,
        "subtotal": 5999.98
      }
    ],
    "shippingAddress": {
      "name": "张三",
      "phone": "13800138000",
      "address": "北京市朝阳区..."
    },
    "payment": {
      "method": "ALIPAY",
      "status": "PENDING",
      "amount": 5999.98
    },
    "createdAt": "2025-01-16T10:00:00Z",
    "updatedAt": "2025-01-16T10:00:00Z"
  }
}
```

---

#### 创建订单

```http
POST /api/orders
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "items": [
    {
      "solutionId": "sol123...",
      "quantity": 2,
      "price": 2999.99
    }
  ],
  "shippingAddress": {
    "name": "张三",
    "phone": "13800138000",
    "province": "北京市",
    "city": "朝阳区",
    "address": "某某街道123号"
  },
  "notes": "请在工作日配送"
}
```

**响应**: `201 Created`

---

#### 取消订单

```http
POST /api/orders/{id}/cancel
Authorization: Bearer <token>
```

**响应**: `200 OK`

---

### 6.6 支付 (Payments)

#### 创建支付

```http
POST /api/payments/create
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "orderId": "ord123...",
  "paymentMethod": "ALIPAY",
  "returnUrl": "https://openaero.cn/orders/ord123..."
}
```

**响应**: `200 OK`
```json
{
  "success": true,
  "data": {
    "paymentId": "pay123...",
    "paymentUrl": "https://openapi.alipay.com/...",
    "qrCode": "https://qr.alipay.com/..."
  }
}
```

---

#### 支付回调（Webhook）

```http
POST /api/payments/callback/alipay
```

**说明**: 由支付服务商调用，验证签名后更新订单状态

---

### 6.7 文件 (Files)

#### 上传文件

```http
POST /api/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**请求体**: Form Data
- `file`: 文件（必填）
- `type`: 文件类型（可选，如 `IMAGE`, `DOCUMENT`）
- `description`: 文件描述（可选）

**响应**: `201 Created`
```json
{
  "success": true,
  "message": "文件上传成功",
  "data": {
    "id": "file123...",
    "filename": "drone-design.jpg",
    "url": "https://storage.openaero.cn/files/...",
    "size": 2048000,
    "mimeType": "image/jpeg",
    "createdAt": "2025-01-16T10:00:00Z"
  }
}
```

---

#### 删除文件

```http
DELETE /api/files/{filename}
Authorization: Bearer <token>
```

**响应**: `204 No Content`

---

### 6.8 通知 (Notifications)

#### 获取通知列表

```http
GET /api/notifications?page=1&limit=20&read=false
Authorization: Bearer <token>
```

**查询参数**:
- `read` (boolean): 筛选已读/未读

**响应**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "notif123...",
      "type": "SOLUTION_APPROVED",
      "title": "您的方案已通过审核",
      "message": "您提交的方案"高性能穿越机方案"已通过审核",
      "read": false,
      "actionUrl": "/solutions/sol123...",
      "createdAt": "2025-01-16T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

#### 标记已读

```http
PATCH /api/notifications/{id}/read
Authorization: Bearer <token>
```

**响应**: `200 OK`

---

#### 标记全部已读

```http
POST /api/notifications/read-all
Authorization: Bearer <token>
```

**响应**: `200 OK`

---

### 6.9 管理员 (Admin)

#### 获取平台统计

```http
GET /api/admin/stats
Authorization: Bearer <token>
```

**权限**: `ADMIN`, `SUPER_ADMIN`

**响应**: `200 OK`
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 5678,
      "active": 4532,
      "creators": 234
    },
    "solutions": {
      "total": 456,
      "published": 321,
      "pending": 45
    },
    "orders": {
      "total": 1234,
      "pending": 56,
      "completed": 1089
    },
    "revenue": {
      "total": 345678.90,
      "thisMonth": 45678.90
    }
  }
}
```

---

#### 用户管理

```http
GET /api/admin/users?page=1&limit=20&role=CREATOR&status=ACTIVE
Authorization: Bearer <token>
```

**权限**: `ADMIN`, `SUPER_ADMIN`

---

#### 方案审核

```http
POST /api/admin/solutions/{id}/review
Authorization: Bearer <token>
```

**权限**: `ADMIN`, `REVIEWER`

**请求体**:
```json
{
  "decision": "APPROVED",
  "notes": "方案质量优秀，符合平台标准",
  "qualityScore": 95,
  "marketPotential": 90
}
```

---

## 7. 速率限制

### 7.1 限制规则

| 端点类型 | 限制 | 时间窗口 |
|---------|------|---------|
| 认证相关 | 5 次 | 1 分钟 |
| 只读 (GET) | 100 次 | 15 分钟 |
| 写操作 (POST/PUT) | 50 次 | 15 分钟 |
| 文件上传 | 10 次 | 1 小时 |

### 7.2 响应头

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705401600
```

### 7.3 超限响应

```json
{
  "success": false,
  "error": "超过速率限制",
  "code": 429,
  "details": {
    "retryAfter": 900,
    "limit": 100,
    "resetAt": "2025-01-16T10:15:00Z"
  }
}
```

---

## 8. 版本管理

### 8.1 版本策略

- 当前版本: `v1`
- 通过 URL 路径指定版本（未来）: `/api/v2/solutions`
- 向后兼容至少 6 个月

### 8.2 废弃通知

废弃的端点会在响应头中提供提示：

```http
Deprecation: true
Sunset: Wed, 01 Jul 2025 00:00:00 GMT
Link: </api/v2/solutions>; rel="successor-version"
```

---

## 📚 相关文档

- [系统架构](./ARCHITECTURE.md)
- [数据库架构](./DATABASE_SCHEMA.md)
- [认证指南](./security/AUTHENTICATION.md)
- [开发指南](../DEVELOPMENT.md)

---

## 📞 支持

- **API 问题**: api@openaero.cn
- **技术支持**: support@openaero.cn
- **文档反馈**: docs@openaero.cn

---

## 🔄 更新日志

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2025-01-16 | 初始版本，完整的 API 文档 |

---

**维护者**: OpenAero API 团队  
**最后更新**: 2025-01-16

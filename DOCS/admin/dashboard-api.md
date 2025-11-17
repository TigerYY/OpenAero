# 管理员仪表板API文档

## 概述

管理员仪表板API提供了一系列端点，用于获取平台统计数据、图表数据、活动流和预警信息。

## 认证

所有API端点都需要管理员权限（`ADMIN`或`SUPER_ADMIN`角色）。

### 请求头

```
Authorization: Bearer <token>
```

## API端点

### 1. 获取统计数据

**GET** `/api/admin/dashboard/stats`

获取平台的核心统计数据。

#### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `days` | number | 否 | 30 | 统计时间范围（天数） |
| `timeRange` | number | 否 | 30 | 同`days`参数 |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "totalSolutions": 100,
    "pendingReviewSolutions": 10,
    "approvedSolutions": 80,
    "rejectedSolutions": 10,
    "totalUsers": 500,
    "activeUsers": 450,
    "totalOrders": 200,
    "totalRevenue": 50000,
    "avgReviewTime": 24.5,
    "recentSolutions": [...],
    "userGrowth": {
      "current": 50,
      "previous": 45,
      "growthRate": 11.1
    },
    "solutionTrends": [...]
  },
  "message": "统计数据获取成功"
}
```

#### 缓存

- TTL: 5分钟
- 响应头: `X-Cache: HIT` 或 `X-Cache: MISS`

---

### 2. 获取图表数据

**GET** `/api/admin/dashboard/charts`

获取用于数据可视化的图表数据。

#### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `days` | number | 否 | 30 | 时间范围（天数） |
| `timeRange` | number | 否 | 30 | 同`days`参数 |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "trends": [
      {
        "date": "2024-01-01",
        "solutions": 10,
        "users": 5
      }
    ],
    "categoryDistribution": [
      {
        "name": "分类1",
        "value": 50,
        "percentage": 25.5
      }
    ],
    "statusDistribution": [
      {
        "status": "ACTIVE",
        "name": "活跃",
        "count": 80
      }
    ],
    "revenueTrend": [
      {
        "date": "2024-01-01",
        "revenue": 1000
      }
    ]
  },
  "message": "图表数据获取成功"
}
```

#### 缓存

- TTL: 10分钟
- 响应头: `X-Cache: HIT` 或 `X-Cache: MISS`

---

### 3. 获取活动流

**GET** `/api/admin/dashboard/activities`

获取平台的实时活动流。

#### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `page` | number | 否 | 1 | 页码 |
| `limit` | number | 否 | 20 | 每页数量（最大100） |
| `type` | string | 否 | - | 活动类型筛选：`user_registration`, `solution_submission`, `review_completion`, `order_creation` |
| `days` | number | 否 | 30 | 时间范围（天数） |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": "1",
        "type": "user_registration",
        "title": "新用户注册",
        "description": "用户test注册了账号",
        "timestamp": "2024-01-15T10:30:00Z",
        "metadata": {
          "userId": "user-123"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  },
  "message": "活动数据获取成功"
}
```

#### 缓存

- TTL: 30秒（仅第一页）
- 响应头: `X-Cache: HIT`, `X-Cache: MISS`, 或 `X-Cache: NO-CACHE`

---

### 4. 获取预警列表

**GET** `/api/admin/dashboard/alerts`

获取系统预警和通知。

#### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `timeRange` | number | 否 | 30 | 时间范围（天数） |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "alert-1",
        "level": "critical",
        "title": "待审核方案积压",
        "message": "当前有25个待审核方案，超过阈值20",
        "metric": "pending_solutions",
        "value": 25,
        "threshold": 20,
        "timestamp": "2024-01-15T10:30:00Z"
      }
    ],
    "summary": {
      "total": 3,
      "critical": 1,
      "warning": 1,
      "info": 1
    }
  },
  "message": "预警数据获取成功"
}
```

#### 预警级别

- `critical`: 严重问题，需要立即处理
- `warning`: 警告，需要关注
- `info`: 信息提示

#### 缓存

- TTL: 1分钟
- 响应头: `X-Cache: HIT` 或 `X-Cache: MISS`

---

### 5. 快速操作

**POST** `/api/admin/dashboard/quick-actions`

执行管理员快速操作。

#### 请求体

```json
{
  "action": "approve_all_pending",
  "params": {
    "reason": "批量批准"
  }
}
```

#### 支持的操作

- `approve_all_pending`: 批量批准所有待审核方案
- `reject_all_pending`: 批量拒绝所有待审核方案（需要`reason`参数）
- `export_solutions`: 导出方案数据
- `export_users`: 导出用户数据

#### 响应示例

```json
{
  "success": true,
  "data": {
    "approved": 10,
    "total": 10
  },
  "message": "批量批准完成: 10个方案已批准"
}
```

---

## 错误响应

所有API在出错时返回以下格式：

```json
{
  "success": false,
  "error": "错误描述",
  "data": null
}
```

### HTTP状态码

- `200`: 成功
- `401`: 未授权（未登录或token无效）
- `403`: 权限不足（非管理员）
- `500`: 服务器错误

---

## 性能优化

### 缓存策略

- 统计数据：5分钟TTL
- 图表数据：10分钟TTL
- 活动流：30秒TTL（仅第一页）
- 预警数据：1分钟TTL

### 缓存清除

以下操作会自动清除相关缓存：
- 批量批准/拒绝方案
- 方案状态变更
- 用户状态变更

---

## 使用示例

### JavaScript/TypeScript

```typescript
// 获取统计数据
const response = await fetch('/api/admin/dashboard/stats?days=30', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
const data = await response.json();

// 获取图表数据
const chartsResponse = await fetch('/api/admin/dashboard/charts?days=30', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
const chartsData = await chartsResponse.json();
```

### cURL

```bash
# 获取统计数据
curl -X GET "http://localhost:3000/api/admin/dashboard/stats?days=30" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 获取活动流
curl -X GET "http://localhost:3000/api/admin/dashboard/activities?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```


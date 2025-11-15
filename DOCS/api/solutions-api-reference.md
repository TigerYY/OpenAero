# 方案管理 API 参考文档

**版本**: 1.0.0  
**最后更新**: 2024-12  
**功能**: 方案提交、审核、发布全流程 API

## 目录

- [概述](#概述)
- [认证](#认证)
- [统一响应格式](#统一响应格式)
- [方案提交 API](#方案提交-api)
- [方案审核 API](#方案审核-api)
- [方案发布 API](#方案发布-api)
- [方案查询 API](#方案查询-api)
- [BOM 管理 API](#bom-管理-api)
- [资产管理 API](#资产管理-api)
- [数据迁移说明](#数据迁移说明)

## 概述

方案管理 API 提供了完整的方案生命周期管理功能，包括：

- **方案创建和编辑**: 创作者可以创建和编辑方案
- **方案提交**: 创作者提交方案进行审核
- **方案审核**: 审核员可以审核方案（通过/拒绝）
- **方案发布**: 管理员可以发布或下架方案
- **BOM 管理**: 管理方案的物料清单（Bill of Materials）
- **资产管理**: 管理方案的资产文件（图片、文档、视频、CAD 等）

## 认证

所有 API 端点都需要认证。认证方式：

### Session-based Authentication（推荐）

使用 HTTP-only cookies，由 NextAuth.js 自动管理：

```http
Cookie: next-auth.session-token=<session_token>
```

### Bearer Token Authentication

```http
Authorization: Bearer <jwt_token>
```

## 统一响应格式

所有 API 响应遵循统一格式：

### 成功响应

```json
{
  "success": true,
  "data": {
    // 响应数据
  },
  "message": "操作成功"
}
```

### 分页响应

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 错误响应

```json
{
  "success": false,
  "error": "错误消息",
  "details": {
    "field": "具体错误详情"
  }
}
```

### HTTP 状态码

- `200` - 成功
- `201` - 创建成功
- `400` - 请求错误（验证失败）
- `401` - 未授权
- `403` - 权限不足
- `404` - 资源不存在
- `500` - 服务器错误

## 方案提交 API

### POST /api/solutions/[id]/submit

提交方案进行审核。

**权限要求**: `CREATOR`、`ADMIN`、`SUPER_ADMIN`

**请求参数**:
- `id` (路径参数): 方案 ID

**请求体**: 无（方案数据已在创建/编辑时保存）

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "solution_123",
    "status": "PENDING_REVIEW",
    "submittedAt": "2024-12-01T10:00:00Z"
  },
  "message": "方案已提交审核"
}
```

**验证规则**:
- 方案状态必须为 `DRAFT` 或 `REJECTED`
- 必须包含以下必填字段：
  - `title`: 方案标题
  - `description`: 方案描述
  - `category`: 方案分类
- 必须至少包含一个资产（`SolutionAsset` 或 `SolutionFile`）
- 必须至少包含一个 BOM 项（`SolutionBomItem` 或 JSON `bom`）

**状态转换**:
- `DRAFT` → `PENDING_REVIEW`
- `REJECTED` → `PENDING_REVIEW`

**错误响应**:

```json
{
  "success": false,
  "error": "方案验证失败",
  "details": {
    "assets": "至少需要一个资产",
    "bom": "至少需要一个 BOM 项"
  }
}
```

### GET /api/solutions/mine

获取当前创作者的所有方案。

**权限要求**: `CREATOR`、`ADMIN`、`SUPER_ADMIN`

**查询参数**:
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 10，最大 100
- `status` (可选): 状态筛选（`DRAFT`、`PENDING_REVIEW`、`APPROVED`、`REJECTED`、`PUBLISHED`、`ARCHIVED`）
- `category` (可选): 分类筛选
- `search` (可选): 搜索关键词（标题、描述）

**响应示例**:

```json
{
  "success": true,
  "data": [
    {
      "id": "solution_123",
      "title": "无人机方案 A",
      "status": "PENDING_REVIEW",
      "category": "agriculture",
      "createdAt": "2024-12-01T10:00:00Z",
      "updatedAt": "2024-12-01T10:00:00Z",
      "submittedAt": "2024-12-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 方案审核 API

### PUT /api/admin/solutions/[id]/review

审核方案（通过或拒绝）。

**权限要求**: `REVIEWER`、`ADMIN`、`SUPER_ADMIN`

**请求参数**:
- `id` (路径参数): 方案 ID

**请求体**:

```json
{
  "decision": "APPROVED", // 或 "REJECTED"
  "comment": "审核意见（必填）",
  "scores": { // 可选，仅在 REJECTED 时使用
    "technical": 7,
    "feasibility": 6,
    "market": 8
  }
}
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "solution_123",
    "status": "APPROVED",
    "lastReviewedAt": "2024-12-01T10:00:00Z",
    "review": {
      "id": "review_456",
      "fromStatus": "PENDING_REVIEW",
      "toStatus": "APPROVED",
      "comment": "方案质量优秀，技术可行",
      "reviewer": {
        "id": "user_789",
        "name": "审核员 A"
      },
      "createdAt": "2024-12-01T10:00:00Z"
    }
  },
  "message": "审核完成"
}
```

**验证规则**:
- 方案状态必须为 `PENDING_REVIEW`
- `comment` 字段必填
- `decision` 必须是 `APPROVED` 或 `REJECTED`
- 拒绝时可以提供 `scores`（可选）

**状态转换**:
- `PENDING_REVIEW` → `APPROVED`
- `PENDING_REVIEW` → `REJECTED`

### GET /api/admin/solutions/[id]/review

获取方案的审核历史。

**权限要求**: `REVIEWER`、`ADMIN`、`SUPER_ADMIN`、`CREATOR`（仅限自己创建的方案）

**请求参数**:
- `id` (路径参数): 方案 ID

**响应示例**:

```json
{
  "success": true,
  "data": [
    {
      "id": "review_456",
      "fromStatus": "DRAFT",
      "toStatus": "PENDING_REVIEW",
      "comment": "提交审核",
      "reviewer": {
        "id": "user_123",
        "name": "创作者 A"
      },
      "createdAt": "2024-12-01T09:00:00Z"
    },
    {
      "id": "review_789",
      "fromStatus": "PENDING_REVIEW",
      "toStatus": "APPROVED",
      "comment": "方案质量优秀",
      "reviewer": {
        "id": "user_789",
        "name": "审核员 A"
      },
      "scores": {
        "technical": 8,
        "feasibility": 9,
        "market": 8
      },
      "createdAt": "2024-12-01T10:00:00Z"
    }
  ]
}
```

### GET /api/admin/solutions

获取所有方案列表（管理员/审核员视图）。

**权限要求**: `REVIEWER`、`ADMIN`、`SUPER_ADMIN`

**查询参数**:
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 10
- `status` (可选): 状态筛选
- `category` (可选): 分类筛选
- `search` (可选): 搜索关键词
- `creatorId` (可选): 创作者 ID 筛选

**响应示例**:

```json
{
  "success": true,
  "data": [
    {
      "id": "solution_123",
      "title": "无人机方案 A",
      "status": "PENDING_REVIEW",
      "category": "agriculture",
      "creator": {
        "id": "creator_456",
        "name": "创作者 A"
      },
      "assets": [
        {
          "id": "asset_789",
          "type": "IMAGE",
          "url": "https://...",
          "title": "架构图"
        }
      ],
      "bomItems": [
        {
          "id": "bom_101",
          "name": "电机",
          "quantity": 4,
          "unit": "个"
        }
      ],
      "createdAt": "2024-12-01T10:00:00Z",
      "submittedAt": "2024-12-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

## 方案发布 API

### POST /api/solutions/[id]/publish

发布或下架方案。

**权限要求**: `ADMIN`、`SUPER_ADMIN`

**请求参数**:
- `id` (路径参数): 方案 ID

**请求体**:

```json
{
  "action": "PUBLISH" // 或 "ARCHIVE"
}
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "solution_123",
    "status": "PUBLISHED",
    "publishedAt": "2024-12-01T10:00:00Z"
  },
  "message": "方案已发布"
}
```

**验证规则**:
- 发布 (`PUBLISH`): 方案状态必须为 `APPROVED`
- 下架 (`ARCHIVE`): 方案状态必须为 `PUBLISHED`

**状态转换**:
- `APPROVED` → `PUBLISHED` (action: PUBLISH)
- `PUBLISHED` → `ARCHIVED` (action: ARCHIVE)

## 方案查询 API

### GET /api/solutions

获取方案列表（公共/管理员视图）。

**权限要求**: 公共访问（仅返回 `PUBLISHED` 方案）或 `CREATOR`/`ADMIN`/`SUPER_ADMIN`（可筛选状态）

**查询参数**:
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 10
- `status` (可选): 状态筛选（仅管理员/创作者可用）
- `category` (可选): 分类筛选
- `search` (可选): 搜索关键词
- `sort` (可选): 排序字段（`createdAt`、`updatedAt`、`publishedAt`）
- `order` (可选): 排序方向（`asc`、`desc`）

**响应示例**:

```json
{
  "success": true,
  "data": [
    {
      "id": "solution_123",
      "title": "无人机方案 A",
      "summary": "方案摘要",
      "status": "PUBLISHED",
      "category": "agriculture",
      "images": ["https://..."],
      "assets": [
        {
          "id": "asset_789",
          "type": "IMAGE",
          "url": "https://...",
          "title": "预览图"
        }
      ],
      "bomItems": [
        {
          "id": "bom_101",
          "name": "电机",
          "quantity": 4
        }
      ],
      "publishedAt": "2024-12-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

**权限说明**:
- **公共访问**: 仅返回 `PUBLISHED` 状态的方案
- **管理员/创作者**: 可以筛选所有状态

### GET /api/solutions/[id]

获取方案详情。

**权限要求**:
- **公共访问**: 仅可访问 `PUBLISHED` 方案
- **CREATOR**: 可访问自己创建的所有方案
- **ADMIN/REVIEWER**: 可访问所有方案

**请求参数**:
- `id` (路径参数): 方案 ID

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "solution_123",
    "title": "无人机方案 A",
    "description": "详细描述",
    "summary": "方案摘要",
    "category": "agriculture",
    "status": "PUBLISHED",
    "images": ["https://..."],
    "tags": ["农业", "无人机"],
    "technicalSpecs": {
      "飞行时间": "30分钟",
      "载重": "5kg"
    },
    "useCases": {
      "场景1": "农田喷洒"
    },
    "architecture": {
      "图1": "https://..."
    },
    "assets": [
      {
        "id": "asset_789",
        "type": "IMAGE",
        "url": "https://...",
        "title": "架构图",
        "description": "系统架构图"
      }
    ],
    "bomItems": [
      {
        "id": "bom_101",
        "name": "电机",
        "model": "T-Motor MN4014",
        "quantity": 4,
        "unit": "个",
        "unitPrice": 150.00,
        "supplier": "供应商A",
        "partNumber": "TM-MN4014",
        "manufacturer": "T-Motor",
        "category": "MOTOR",
        "position": "四轴",
        "weight": 120.5,
        "specifications": {
          "KV": 400,
          "功率": "500W"
        },
        "productId": "product_123"
      }
    ],
    "creator": {
      "id": "creator_456",
      "name": "创作者 A"
    },
    "version": 1,
    "publishedAt": "2024-12-01T10:00:00Z",
    "createdAt": "2024-12-01T09:00:00Z",
    "updatedAt": "2024-12-01T10:00:00Z"
  }
}
```

## BOM 管理 API

### PUT /api/solutions/[id]/bom

更新方案的 BOM 清单。

**权限要求**: `CREATOR`（方案所有者）、`ADMIN`、`SUPER_ADMIN`

**请求参数**:
- `id` (路径参数): 方案 ID

**请求体**:

```json
{
  "items": [
    {
      "name": "电机",
      "model": "T-Motor MN4014",
      "quantity": 4,
      "unit": "个",
      "unitPrice": 150.00,
      "supplier": "供应商A",
      "partNumber": "TM-MN4014",
      "manufacturer": "T-Motor",
      "category": "MOTOR",
      "position": "四轴",
      "weight": 120.5,
      "specifications": {
        "KV": 400,
        "功率": "500W"
      },
      "productId": "product_123",
      "notes": "备注信息"
    }
  ]
}
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "bom_101",
        "solutionId": "solution_123",
        "name": "电机",
        "model": "T-Motor MN4014",
        "quantity": 4,
        "unit": "个",
        "unitPrice": 150.00,
        "supplier": "供应商A",
        "partNumber": "TM-MN4014",
        "manufacturer": "T-Motor",
        "category": "MOTOR",
        "position": "四轴",
        "weight": 120.5,
        "specifications": {
          "KV": 400,
          "功率": "500W"
        },
        "productId": "product_123",
        "notes": "备注信息",
        "createdAt": "2024-12-01T10:00:00Z"
      }
    ]
  },
  "message": "BOM 清单已更新"
}
```

**验证规则**:
- 方案状态必须为 `DRAFT` 或 `REJECTED`（允许编辑）
- 用户必须是方案所有者（或管理员）
- `name` 和 `quantity` 字段必填
- `productId` 如果提供，必须引用有效的商品

**字段说明**:
- `name`: 物料名称（必填）
- `model`: 型号（可选）
- `quantity`: 数量（必填，整数）
- `unit`: 单位（可选，默认"个"）
- `unitPrice`: 单价（可选，Decimal）
- `supplier`: 供应商（可选）
- `partNumber`: 零件号/SKU（可选）
- `manufacturer`: 制造商（可选）
- `category`: 物料类别（可选，枚举值：`FRAME`、`MOTOR`、`ESC`、`PROPELLER`、`FLIGHT_CONTROLLER`、`BATTERY`、`CAMERA`、`GIMBAL`、`RECEIVER`、`TRANSMITTER`、`OTHER`）
- `position`: 安装位置（可选）
- `weight`: 重量（可选，单位：克）
- `specifications`: 详细规格（可选，JSON）
- `productId`: 关联商城商品 ID（可选）
- `notes`: 备注（可选）

### GET /api/solutions/[id]/bom

获取方案的 BOM 清单。

**权限要求**: 与 `GET /api/solutions/[id]` 相同

**请求参数**:
- `id` (路径参数): 方案 ID

**响应示例**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "bom_101",
        "name": "电机",
        "model": "T-Motor MN4014",
        "quantity": 4,
        "unit": "个",
        "unitPrice": 150.00,
        "supplier": "供应商A",
        "partNumber": "TM-MN4014",
        "manufacturer": "T-Motor",
        "category": "MOTOR",
        "position": "四轴",
        "weight": 120.5,
        "specifications": {
          "KV": 400,
          "功率": "500W"
        },
        "productId": "product_123",
        "notes": "备注信息"
      }
    ]
  }
}
```

**数据兼容性**:
- 优先返回 `SolutionBomItem` 表数据
- 如果表数据不存在，fallback 到 `Solution.bom` JSON 字段（向后兼容）

## 资产管理 API

### POST /api/solutions/[id]/assets

添加方案资产。

**权限要求**: `CREATOR`（方案所有者）、`ADMIN`、`SUPER_ADMIN`

**请求参数**:
- `id` (路径参数): 方案 ID

**请求体**:

```json
{
  "type": "IMAGE", // IMAGE, DOCUMENT, VIDEO, CAD, OTHER
  "url": "https://...",
  "title": "架构图",
  "description": "系统架构图"
}
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "asset_789",
    "solutionId": "solution_123",
    "type": "IMAGE",
    "url": "https://...",
    "title": "架构图",
    "description": "系统架构图",
    "createdAt": "2024-12-01T10:00:00Z"
  },
  "message": "资产已添加"
}
```

**验证规则**:
- 方案状态必须为 `DRAFT` 或 `REJECTED`（允许编辑）
- `type` 必须是有效的 `AssetType` 枚举值
- `url` 必须是有效的 URL

### GET /api/solutions/[id]/assets

获取方案资产列表。

**权限要求**: 与 `GET /api/solutions/[id]` 相同

**请求参数**:
- `id` (路径参数): 方案 ID

**响应示例**:

```json
{
  "success": true,
  "data": [
    {
      "id": "asset_789",
      "type": "IMAGE",
      "url": "https://...",
      "title": "架构图",
      "description": "系统架构图",
      "createdAt": "2024-12-01T10:00:00Z"
    }
  ]
}
```

### DELETE /api/solutions/[id]/assets

删除方案资产。

**权限要求**: `CREATOR`（方案所有者）、`ADMIN`、`SUPER_ADMIN`

**请求参数**:
- `id` (路径参数): 方案 ID
- `assetId` (查询参数): 资产 ID

**响应示例**:

```json
{
  "success": true,
  "message": "资产已删除"
}
```

## 数据迁移说明

### BOM 数据迁移

系统支持从 JSON 格式的 `Solution.bom` 字段迁移到关系表 `SolutionBomItem`。

#### 迁移状态检查

```bash
npm run bom:check
```

#### 预览迁移

```bash
npm run bom:migrate:dry-run
```

#### 执行迁移

```bash
npm run bom:migrate
```

#### 验证数据完整性

```bash
npm run bom:validate:report
```

#### 回滚迁移

```bash
npm run bom:migrate:rollback
```

#### 双写策略

在迁移过渡期间，API 支持双写策略：

- **写入**: 同时写入 `SolutionBomItem` 表和 `Solution.bom` JSON 字段（如果字段存在）
- **读取**: 优先读取 `SolutionBomItem` 表，如果不存在则 fallback 到 JSON 字段

可以通过环境变量控制双写行为：

```bash
ENABLE_BOM_DUAL_WRITE=false  # 禁用双写
```

#### 迁移脚本说明

- **迁移脚本**: `scripts/migrate-bom-to-table.ts`
- **验证脚本**: `scripts/validate-bom-data-integrity.ts`
- **状态检查**: `scripts/check-bom-migration-status.ts`

详细迁移文档请参考：`openspec/changes/implement-solution-submission-flow/BOM_MIGRATION_STATUS.md`

## 错误代码

| 错误代码 | HTTP 状态码 | 说明 |
|---------|------------|------|
| `UNAUTHORIZED` | 401 | 未授权访问 |
| `FORBIDDEN` | 403 | 权限不足 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `VALIDATION_ERROR` | 400 | 验证失败 |
| `INVALID_STATUS_TRANSITION` | 400 | 无效的状态转换 |
| `SOLUTION_NOT_COMPLETE` | 400 | 方案不完整（缺少必填字段或资产） |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

## 最佳实践

1. **状态管理**: 始终通过 API 进行状态转换，不要直接修改数据库
2. **验证**: 提交前确保方案包含所有必填字段和至少一个资产/BOM 项
3. **权限**: 使用正确的角色权限访问 API
4. **错误处理**: 检查响应中的 `success` 字段和错误详情
5. **分页**: 对于列表 API，始终使用分页参数以避免性能问题
6. **数据迁移**: 在生产环境执行迁移前，先运行预览和验证脚本

## 相关文档

- [开发文档 - 方案提交流程](./development/solution-submission-flow-guide.md)
- [状态机规则](./development/solution-status-workflow.md)
- [权限规则](./development/permissions-guide.md)
- [BOM 迁移状态](./../openspec/changes/implement-solution-submission-flow/BOM_MIGRATION_STATUS.md)


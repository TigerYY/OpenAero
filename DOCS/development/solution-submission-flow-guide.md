# 方案提交审核发布流程开发指南

**版本**: 1.0.0  
**最后更新**: 2024-12  
**功能**: 方案提交、审核、发布全流程开发文档

## 目录

- [概述](#概述)
- [状态机规则](#状态机规则)
- [权限规则](#权限规则)
- [数据模型](#数据模型)
- [API 实现](#api-实现)
- [前端实现](#前端实现)
- [数据迁移流程](#数据迁移流程)
- [最佳实践](#最佳实践)
- [故障排查](#故障排查)

## 概述

方案提交审核发布流程是一个完整的状态机系统，支持以下功能：

1. **方案创建**: 创作者创建方案草稿
2. **方案提交**: 创作者提交方案进行审核
3. **方案审核**: 审核员审核方案（通过/拒绝）
4. **方案发布**: 管理员发布或下架方案
5. **BOM 管理**: 管理方案的物料清单
6. **资产管理**: 管理方案的资产文件

## 状态机规则

### 状态定义

```typescript
enum SolutionStatus {
  DRAFT = 'DRAFT',              // 草稿
  PENDING_REVIEW = 'PENDING_REVIEW',  // 待审核
  APPROVED = 'APPROVED',        // 已通过
  REJECTED = 'REJECTED',         // 已拒绝
  PUBLISHED = 'PUBLISHED',      // 已发布
  ARCHIVED = 'ARCHIVED'         // 已归档
}
```

### 状态转换规则

| 从状态 | 到状态 | 操作 | 权限要求 | 说明 |
|--------|--------|------|----------|------|
| `DRAFT` | `PENDING_REVIEW` | 提交审核 | CREATOR | 提交方案进行审核 |
| `DRAFT` | `ARCHIVED` | 归档 | CREATOR | 归档草稿 |
| `PENDING_REVIEW` | `APPROVED` | 审核通过 | REVIEWER, ADMIN | 审核员/管理员审核通过 |
| `PENDING_REVIEW` | `REJECTED` | 审核拒绝 | REVIEWER, ADMIN | 审核员/管理员审核拒绝 |
| `APPROVED` | `PUBLISHED` | 发布 | ADMIN | 管理员发布方案 |
| `APPROVED` | `REJECTED` | 撤销通过 | ADMIN | 管理员撤销通过状态 |
| `REJECTED` | `DRAFT` | 重新编辑 | CREATOR | 创作者重新编辑被拒绝的方案 |
| `REJECTED` | `ARCHIVED` | 归档 | CREATOR | 归档被拒绝的方案 |
| `PUBLISHED` | `ARCHIVED` | 下架 | ADMIN, CREATOR | 下架已发布的方案 |
| `ARCHIVED` | `DRAFT` | 恢复编辑 | CREATOR | 恢复归档的方案 |

### 状态转换验证

状态转换验证函数位于 `src/lib/solution-status-workflow.ts`：

```typescript
import { isValidStatusTransition } from '@/lib/solution-status-workflow';

// 验证状态转换
const result = isValidStatusTransition(
  SolutionStatus.DRAFT,
  SolutionStatus.PENDING_REVIEW,
  userRole,
  solution
);

if (!result.valid) {
  throw new Error(result.error);
}
```

### 权限检查函数

```typescript
import {
  canEditSolution,
  canReviewSolution,
  canPublishSolution,
  canViewSolution
} from '@/lib/solution-status-workflow';

// 检查是否可以编辑
if (!canEditSolution(solution, user)) {
  throw new Error('无权编辑此方案');
}

// 检查是否可以审核
if (!canReviewSolution(solution, user)) {
  throw new Error('无权审核此方案');
}

// 检查是否可以发布
if (!canPublishSolution(solution, user)) {
  throw new Error('无权发布此方案');
}

// 检查是否可以查看
if (!canViewSolution(solution, user)) {
  throw new Error('无权查看此方案');
}
```

## 权限规则

### 角色定义

系统支持多角色，用户可以有多个角色：

```typescript
enum UserRole {
  USER = 'USER',              // 普通用户
  CREATOR = 'CREATOR',        // 创作者
  REVIEWER = 'REVIEWER',      // 审核员
  ADMIN = 'ADMIN',            // 管理员
  SUPER_ADMIN = 'SUPER_ADMIN' // 超级管理员
}
```

### 权限矩阵

| 操作 | USER | CREATOR | REVIEWER | ADMIN | SUPER_ADMIN |
|------|------|---------|----------|-------|-------------|
| 查看已发布方案 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 创建方案 | ❌ | ✅ | ❌ | ✅ | ✅ |
| 编辑自己的方案 | ❌ | ✅ | ❌ | ✅ | ✅ |
| 提交审核 | ❌ | ✅ | ❌ | ✅ | ✅ |
| 审核方案 | ❌ | ❌ | ✅ | ✅ | ✅ |
| 发布方案 | ❌ | ❌ | ❌ | ✅ | ✅ |
| 查看所有方案 | ❌ | ❌ | ✅ | ✅ | ✅ |
| 管理用户 | ❌ | ❌ | ❌ | ✅ | ✅ |

### 权限检查实现

#### API 路由权限检查

使用统一的权限检查函数：

```typescript
import {
  requireCreatorAuth,
  requireReviewerAuth,
  requireAdminAuth
} from '@/lib/api-helpers';

// 创作者权限检查
export async function POST(request: NextRequest) {
  const authResult = await requireCreatorAuth(request);
  if (!authResult.success) {
    return authResult.error;
  }
  // ... 业务逻辑
}

// 审核员权限检查
export async function PUT(request: NextRequest) {
  const authResult = await requireReviewerAuth(request);
  if (!authResult.success) {
    return authResult.error;
  }
  // ... 业务逻辑
}

// 管理员权限检查
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return authResult.error;
  }
  // ... 业务逻辑
}
```

#### 前端权限检查

使用 `ProtectedRoute` 组件：

```typescript
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminRoute } from '@/components/auth/ProtectedRoute';
import { CreatorRoute } from '@/components/auth/ProtectedRoute';

// 管理员路由
export default function AdminPage() {
  return (
    <AdminRoute>
      <AdminContent />
    </AdminRoute>
  );
}

// 创作者路由
export default function CreatorPage() {
  return (
    <CreatorRoute>
      <CreatorContent />
    </CreatorRoute>
  );
}
```

### 多角色支持

系统支持用户拥有多个角色。权限检查时，只要用户拥有任一所需角色即可：

```typescript
// 用户角色数组
const userRoles = ['CREATOR', 'REVIEWER'];

// 检查是否有 CREATOR 角色
if (userRoles.includes('CREATOR')) {
  // 允许操作
}

// 检查是否有 REVIEWER 或 ADMIN 角色
if (userRoles.includes('REVIEWER') || userRoles.includes('ADMIN')) {
  // 允许操作
}
```

## 数据模型

### Solution 模型

```prisma
model Solution {
  id             String         @id @default(cuid())
  title          String
  description    String
  summary        String?        @db.Text
  category       String
  status         SolutionStatus @default(DRAFT)
  
  // 关联关系
  creatorId      String?
  creator        CreatorProfile? @relation(...)
  assets         SolutionAsset[]
  bomItems       SolutionBomItem[]
  solutionReviews SolutionReview[]
  
  // 时间戳
  submittedAt    DateTime?
  lastReviewedAt DateTime?
  publishedAt    DateTime?
  archivedAt     DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

### SolutionAsset 模型

```prisma
model SolutionAsset {
  id          String   @id @default(cuid())
  solutionId  String
  solution    Solution @relation(...)
  
  type        AssetType  // IMAGE, DOCUMENT, VIDEO, CAD, OTHER
  url         String
  title       String?
  description String?
  
  createdAt   DateTime @default(now())
}
```

### SolutionBomItem 模型

```prisma
model SolutionBomItem {
  id         String   @id @default(cuid())
  solutionId String
  solution   Solution @relation(...)
  
  // 基础信息
  name       String
  model      String?
  quantity   Int      @default(1)
  unit       String?  @default("个")
  notes      String?
  
  // 价格和成本
  unitPrice  Decimal? @db.Decimal(10, 2)
  
  // 供应商信息
  supplier   String?
  
  // 零件标识
  partNumber   String?
  manufacturer String?
  
  // 分类和位置
  category String?
  position String?
  
  // 物理属性
  weight Decimal? @db.Decimal(10, 3)
  
  // 技术规格
  specifications Json?
  
  // 关联商城商品
  productId String?
  product   Product? @relation(...)
  
  createdAt DateTime @default(now())
}
```

### SolutionReview 模型

```prisma
model SolutionReview {
  id         String   @id @default(cuid())
  solutionId String
  solution   Solution @relation(...)
  
  fromStatus SolutionStatus
  toStatus   SolutionStatus
  comment    String
  scores     Json?
  
  reviewerId String
  reviewer   User @relation(...)
  
  createdAt  DateTime @default(now())
}
```

## API 实现

### 方案提交验证

提交方案前需要验证方案完整性：

```typescript
import { validateSubmission } from '@/lib/solution-submission-validator';

const validationResult = validateSubmission(solution);

if (!validationResult.valid) {
  return createValidationErrorResponse(
    '方案验证失败',
    validationResult.errors
  );
}
```

验证规则：
- 必填字段：`title`、`description`、`category`
- 至少一个资产（`SolutionAsset` 或 `SolutionFile`）
- 至少一个 BOM 项（`SolutionBomItem` 或 JSON `bom`）

### 状态转换实现

```typescript
import { isValidStatusTransition } from '@/lib/solution-status-workflow';

// 验证状态转换
const transitionResult = isValidStatusTransition(
  currentStatus,
  newStatus,
  userRole,
  solution
);

if (!transitionResult.valid) {
  return createErrorResponse(transitionResult.error, 400);
}

// 执行状态转换
await prisma.solution.update({
  where: { id: solutionId },
  data: {
    status: newStatus,
    submittedAt: newStatus === 'PENDING_REVIEW' ? new Date() : undefined,
    publishedAt: newStatus === 'PUBLISHED' ? new Date() : undefined,
    archivedAt: newStatus === 'ARCHIVED' ? new Date() : undefined,
  }
});

// 创建审核记录
await prisma.solutionReview.create({
  data: {
    solutionId,
    fromStatus: currentStatus,
    toStatus: newStatus,
    comment: reviewComment,
    reviewerId: userId,
  }
});
```

## 前端实现

### 方案列表页面

```typescript
// src/app/[locale]/creators/solutions/page.tsx
import { useSolutions } from '@/hooks/use-solutions';

export default function CreatorSolutionsPage() {
  const { solutions, isLoading, error } = useSolutions({
    status: 'PENDING_REVIEW',
  });

  return (
    <div>
      {/* 方案列表 */}
    </div>
  );
}
```

### 方案创建/编辑表单

```typescript
// src/app/[locale]/creators/solutions/new/page.tsx
import { BomForm } from '@/components/solutions/BomForm';
import { FileUpload } from '@/components/ui/FileUpload';

export default function CreateSolutionPage() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    bom: [],
    assets: [],
  });

  const handleSubmit = async () => {
    // 提交方案
    await fetch(`/api/solutions`, {
      method: 'POST',
      body: JSON.stringify(formData),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* 表单字段 */}
      <BomForm
        items={formData.bom}
        onChange={(items) => setFormData({ ...formData, bom: items })}
      />
      <FileUpload
        onUpload={(urls) => setFormData({ ...formData, assets: urls })}
      />
    </form>
  );
}
```

### 审核页面

```typescript
// src/app/[locale]/admin/solutions/[id]/page.tsx
import { ReviewHistory } from '@/components/solutions/ReviewHistory';

export default function AdminSolutionDetailPage() {
  const handleReview = async (decision: 'APPROVED' | 'REJECTED', comment: string) => {
    await fetch(`/api/admin/solutions/${solutionId}/review`, {
      method: 'PUT',
      body: JSON.stringify({ decision, comment }),
    });
  };

  return (
    <div>
      {/* 方案详情 */}
      <ReviewHistory solutionId={solutionId} />
      {/* 审核操作 */}
    </div>
  );
}
```

## 数据迁移流程

### BOM 数据迁移

#### 1. 检查迁移状态

```bash
npm run bom:check
```

输出示例：
```
总共找到 10 个方案
需要迁移: 5
已迁移: 3
无 BOM 数据: 2
```

#### 2. 预览迁移

```bash
npm run bom:migrate:dry-run
```

预览迁移结果，不实际执行。

#### 3. 执行迁移

```bash
npm run bom:migrate
```

将 JSON 格式的 `Solution.bom` 数据迁移到 `SolutionBomItem` 表。

#### 4. 验证数据完整性

```bash
npm run bom:validate:report
```

生成详细的验证报告。

#### 5. 回滚（如需要）

```bash
npm run bom:migrate:rollback
```

### 迁移脚本说明

- **迁移脚本**: `scripts/migrate-bom-to-table.ts`
- **验证脚本**: `scripts/validate-bom-data-integrity.ts`
- **状态检查**: `scripts/check-bom-migration-status.ts`

### 双写策略

在迁移过渡期间，API 支持双写策略：

- **写入**: 同时写入 `SolutionBomItem` 表和 `Solution.bom` JSON 字段（如果字段存在）
- **读取**: 优先读取 `SolutionBomItem` 表，如果不存在则 fallback 到 JSON 字段

可以通过环境变量控制：

```bash
ENABLE_BOM_DUAL_WRITE=false  # 禁用双写
```

## 最佳实践

### 1. 状态管理

- ✅ 始终通过 API 进行状态转换
- ✅ 使用 `isValidStatusTransition` 验证状态转换
- ✅ 记录所有状态转换到 `SolutionReview` 表
- ❌ 不要直接修改数据库状态字段

### 2. 权限检查

- ✅ 使用统一的权限检查函数（`requireCreatorAuth`、`requireReviewerAuth`、`requireAdminAuth`）
- ✅ 在前端使用 `ProtectedRoute` 组件保护路由
- ✅ 在 API 路由中始终验证权限
- ❌ 不要依赖前端权限检查作为唯一安全措施

### 3. 数据验证

- ✅ 使用 `validateSubmission` 验证方案完整性
- ✅ 使用 Zod schema 验证 API 请求体
- ✅ 验证状态转换的有效性
- ❌ 不要跳过验证步骤

### 4. 错误处理

- ✅ 使用统一的错误响应格式
- ✅ 提供详细的错误信息
- ✅ 记录错误到审计日志
- ❌ 不要暴露敏感信息

### 5. 性能优化

- ✅ 使用分页查询列表
- ✅ 限制关联数据数量（如 assets、bomItems）
- ✅ 使用索引优化查询
- ❌ 不要一次性加载所有数据

### 6. 数据迁移

- ✅ 在生产环境执行迁移前先运行预览
- ✅ 验证数据完整性
- ✅ 准备回滚方案
- ❌ 不要在生产环境直接执行未测试的迁移

## 故障排查

### 常见问题

#### 1. 状态转换失败

**问题**: `INVALID_STATUS_TRANSITION` 错误

**原因**:
- 状态转换不符合规则
- 用户权限不足
- 方案不满足转换条件

**解决方案**:
1. 检查状态转换规则表
2. 验证用户权限
3. 检查方案是否满足转换条件（如提交审核需要方案完整性）

#### 2. 权限不足

**问题**: `FORBIDDEN` 错误

**原因**:
- 用户角色不正确
- 用户不是方案所有者（对于编辑操作）

**解决方案**:
1. 检查用户角色
2. 验证方案所有者关系
3. 确认多角色支持已正确实现

#### 3. 方案验证失败

**问题**: `SOLUTION_NOT_COMPLETE` 错误

**原因**:
- 缺少必填字段
- 没有资产或 BOM 项

**解决方案**:
1. 检查必填字段（title、description、category）
2. 确保至少有一个资产
3. 确保至少有一个 BOM 项

#### 4. BOM 数据迁移失败

**问题**: 迁移脚本执行失败

**原因**:
- JSON 格式不正确
- 数据库连接问题
- 数据冲突

**解决方案**:
1. 先运行 `npm run bom:check` 检查状态
2. 运行 `npm run bom:migrate:dry-run` 预览
3. 检查错误日志
4. 如有需要，运行回滚脚本

### 调试技巧

#### 1. 启用调试日志

```typescript
// 在 API 路由中添加日志
console.log('Current status:', solution.status);
console.log('User roles:', userRoles);
console.log('Transition result:', transitionResult);
```

#### 2. 检查数据库状态

```bash
# 使用 Prisma Studio
npm run db:studio

# 或直接查询数据库
psql $DATABASE_URL -c "SELECT id, status, \"creatorId\" FROM solutions WHERE id = 'solution_id';"
```

#### 3. 验证权限

```typescript
// 在 API 路由中验证权限
const authResult = await requireCreatorAuth(request);
console.log('Auth result:', authResult);
console.log('User roles:', authResult.user?.roles);
```

## 相关文档

- [API 参考文档](./../api/solutions-api-reference.md)
- [状态机实现](./../src/lib/solution-status-workflow.ts)
- [提交验证器](./../src/lib/solution-submission-validator.ts)
- [BOM 迁移状态](./../../openspec/changes/implement-solution-submission-flow/BOM_MIGRATION_STATUS.md)


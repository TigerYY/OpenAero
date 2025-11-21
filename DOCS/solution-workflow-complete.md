# 创作者方案提交到发布完整流程

> ⚠️ **注意**: 本文档已过时，请查看 [方案完整生命周期流程文档](./solution-complete-lifecycle.md) 获取最新信息。

本文档详细梳理了创作者从提交方案到审核后发布的全部流程和实现。

## 目录

1. [流程概览](#流程概览)
2. [状态定义](#状态定义)
3. [详细流程](#详细流程)
4. [API 端点](#api-端点)
5. [数据模型](#数据模型)
6. [权限控制](#权限控制)
7. [已知问题](#已知问题)

---

## 流程概览

```
创建方案 (DRAFT)
    ↓
编辑方案内容
    ↓
提交审核 (DRAFT/REJECTED → PENDING_REVIEW)
    ↓
管理员审核 (PENDING_REVIEW → APPROVED/REJECTED)
    ↓
发布方案 (APPROVED → PUBLISHED)
    ↓
公开展示
```

### 状态流转图

```
DRAFT ──────────────┐
                    │ 提交审核
                    ↓
            PENDING_REVIEW
                    │
        ┌───────────┴───────────┐
        │                       │
        ↓ 批准                  ↓ 拒绝
    APPROVED              REJECTED
        │                       │
        │ 发布                  │ 重新编辑
        ↓                       ↓
    PUBLISHED              DRAFT (可重新提交)
        │
        ↓ 下架
    ARCHIVED
```

---

## 状态定义

### SolutionStatus 枚举

```typescript
enum SolutionStatus {
  DRAFT           // 草稿
  PENDING_REVIEW  // 待审核
  APPROVED        // 已批准
  REJECTED        // 已拒绝
  PUBLISHED       // 已发布
  ARCHIVED        // 已归档
}
```

### ReviewDecision 枚举

```typescript
enum ReviewDecision {
  PENDING         // 待处理
  APPROVED        // 批准
  REJECTED        // 拒绝
  NEEDS_REVISION  // 需要修改
}
```

### ReviewStatus 枚举

```typescript
enum ReviewStatus {
  PENDING         // 待开始
  IN_PROGRESS     // 进行中
  COMPLETED       // 已完成
}
```

---

## 详细流程

### 1. 创建方案（DRAFT 状态）

**文件**: `src/app/api/solutions/route.ts` (POST)

**流程**:
1. 验证用户为 CREATOR 角色
2. 确保用户有 CreatorProfile（自动创建）
3. 创建方案记录，状态为 `DRAFT`
4. 记录审计日志

**关键代码**:
```typescript
// 验证用户为 CREATOR 角色
const userRoles = authResult.user.roles || [];
if (!userRoles.includes('CREATOR') && !userRoles.includes('ADMIN') && !userRoles.includes('SUPER_ADMIN')) {
  return createErrorResponse('只有创作者可以创建方案', 403);
}

// 确保用户有 CreatorProfile
const { ensureCreatorProfile } = await import('@/lib/creator-profile-utils');
const creatorProfile = await ensureCreatorProfile(authResult.user.id);

// 创建方案
const solution = await prisma.solution.create({
  data: {
    title: validatedData.title,
    description: validatedData.description,
    category: validatedData.category,
    price: validatedData.price,
    status: 'DRAFT',
    creator_id: creatorProfile.id,
    // ...
  }
});
```

**前端页面**: `src/app/[locale]/creators/solutions/new/page.tsx`

---

### 2. 编辑方案内容

**文件**: `src/app/api/solutions/[id]/route.ts` (PUT)

**允许编辑的状态**:
- `DRAFT`: 可以编辑所有字段
- `REJECTED`: 可以编辑所有字段，准备重新提交

**不允许编辑的状态**:
- `PENDING_REVIEW`: 审核中，不允许编辑
- `APPROVED`: 已批准，需要发布后才能修改
- `PUBLISHED`: 已发布，需要下架后才能修改

**关键验证**:
```typescript
// 验证方案状态允许编辑
if (solution.status !== 'DRAFT' && solution.status !== 'REJECTED') {
  return createErrorResponse('只有草稿或已驳回的方案可以编辑', 400);
}

// 验证用户为方案所有者
if (solution.creator_id !== currentUserCreatorProfile.id) {
  return createErrorResponse('无权编辑此方案', 403);
}
```

---

### 3. 提交审核（DRAFT/REJECTED → PENDING_REVIEW）

**文件**: `src/app/api/solutions/[id]/submit/route.ts` (POST)

**前置条件**:
1. ✅ 方案状态为 `DRAFT` 或 `REJECTED`
2. ✅ 用户为方案所有者（或 ADMIN/SUPER_ADMIN）
3. ✅ 必填字段完整：`title`, `description`, `category`
4. ✅ 至少上传一个资产（图片、文档或视频）

**流程**:
1. 验证用户权限和方案状态
2. 验证方案完整性
3. 使用事务更新方案状态并创建审核记录
4. 记录审计日志

**关键代码**:
```typescript
// 验证方案状态
if (solution.status !== 'DRAFT' && solution.status !== 'REJECTED') {
  return createErrorResponse('只有草稿或已驳回的方案可以提交审核', 400);
}

// 验证必填字段
if (!solution.title || !solution.description || !solution.category) {
  return createErrorResponse('方案信息不完整，请填写标题、描述和分类', 400);
}

// 验证至少一个 asset
if (solution._count.assets === 0) {
  return createErrorResponse('至少需要上传一个资产（图片、文档或视频）', 400);
}

// 使用事务更新状态并创建审核记录
const result = await prisma.$transaction(async (tx) => {
  // 更新方案状态
  const updatedSolution = await tx.solution.update({
    where: { id: solutionId },
    data: {
      status: 'PENDING_REVIEW',
      submitted_at: new Date(),
    }
  });

  // 创建审核记录
  await tx.solutionReview.create({
    data: {
      solutionId: solutionId,
      reviewerId: authResult.user.id, // 提交者ID
      fromStatus: oldStatus,
      toStatus: 'PENDING_REVIEW',
      status: 'PENDING',
      decision: 'PENDING',
      comments: '方案已提交审核',
    }
  });

  return updatedSolution;
});
```

**注意**: 
- ⚠️ **已知问题**: `SolutionReview` 模型中缺少 `fromStatus` 和 `toStatus` 字段，但代码中使用了这些字段。需要添加这些字段到 schema 中。

---

### 4. 管理员审核（PENDING_REVIEW → APPROVED/REJECTED）

**文件**: 
- `src/app/api/admin/solutions/[id]/review/route.ts` (PUT) - 完成审核
- `src/lib/solution-review.ts` - 审核逻辑

**权限要求**:
- `REVIEWER` 或 `ADMIN` 角色

**审核流程**:

#### 4.1 开始审核（可选）

**API**: `POST /api/admin/solutions/[id]/review`

**功能**: 分配审核员，创建审核记录

```typescript
const review = await startReview(solutionId, reviewerId);
```

#### 4.2 完成审核

**API**: `PUT /api/admin/solutions/[id]/review`

**请求体**:
```typescript
{
  reviewId?: string;              // 可选，审核记录ID
  decision: ReviewDecision;       // APPROVED | REJECTED | NEEDS_REVISION
  score?: number;                 // 综合评分 (1-10)
  comments?: string;              // 审核意见
  qualityScore?: number;          // 质量评分 (1-10)
  completeness?: number;          // 完整性评分 (1-10)
  innovation?: number;            // 创新性评分 (1-10)
  marketPotential?: number;      // 市场潜力评分 (1-10)
  decisionNotes?: string;         // 决策说明
  suggestions?: string[];         // 修改建议
  reviewerId?: string;            // 如果没有找到审核记录，需要提供审核员ID
}
```

**状态转换逻辑**:
```typescript
let newStatus: SolutionStatus;
if (data.decision === ReviewDecision.APPROVED) {
  newStatus = SolutionStatus.APPROVED;
} else if (data.decision === ReviewDecision.REJECTED) {
  newStatus = SolutionStatus.REJECTED;
} else if (data.decision === ReviewDecision.NEEDS_REVISION) {
  newStatus = SolutionStatus.PENDING_REVIEW; // 保持待审核状态，等待修改
} else {
  newStatus = fromStatus; // 保持原状态
}
```

**关键代码**:
```typescript
// 使用事务更新审核记录和方案状态
const [updatedReviewRecord, updatedSolution] = await prisma.$transaction([
  // 更新审核记录
  prisma.solutionReview.update({
    where: { id: review.id },
    data: {
      status: ReviewStatus.COMPLETED,
      decision: data.decision,
      fromStatus: fromStatus,  // ⚠️ 字段不存在于 schema
      toStatus: newStatus,     // ⚠️ 字段不存在于 schema
      score: data.score,
      comments: data.comments,
      // ...
      reviewedAt: new Date(),
    },
  }),
  // 更新方案状态
  prisma.solution.update({
    where: { id: solutionId },
    data: {
      status: newStatus,
      reviewed_at: new Date(),
      lastReviewedAt: new Date(),
      review_notes: data.decisionNotes || data.comments || null,
    },
  }),
]);
```

**前端页面**: `src/app/[locale]/admin/solutions/[id]/page.tsx`

---

### 5. 发布方案（APPROVED → PUBLISHED）

**文件**: `src/app/api/solutions/[id]/publish/route.ts` (POST)

**权限要求**:
- `ADMIN` 或 `SUPER_ADMIN` 角色

**前置条件**:
- ✅ 方案状态为 `APPROVED`

**请求体**:
```typescript
{
  action: 'PUBLISH' | 'ARCHIVE'
}
```

**发布流程**:
```typescript
if (validatedData.action === 'PUBLISH') {
  // 验证状态为 APPROVED
  if (solution.status !== 'APPROVED') {
    return createErrorResponse('只有已审核通过的方案可以发布', 400);
  }
  newStatus = 'PUBLISHED';
  timestampField = 'publishedAt';
} else {
  // 下架：验证状态为 PUBLISHED
  if (solution.status !== 'PUBLISHED') {
    return createErrorResponse('只有已发布的方案可以下架', 400);
  }
  newStatus = 'ARCHIVED';
  timestampField = 'archivedAt';
}

// 使用事务更新方案状态并创建审核记录
const result = await prisma.$transaction(async (tx) => {
  // 更新方案状态
  const updatedSolution = await tx.solution.update({
    where: { id },
    data: {
      status: newStatus,
      [timestampField]: new Date(),
    }
  });

  // 创建审核记录（记录状态转换）
  await tx.solutionReview.create({
    data: {
      solutionId: id,
      reviewerId: authResult.user.id,
      fromStatus: solution.status,  // ⚠️ 字段不存在于 schema
      toStatus: newStatus,          // ⚠️ 字段不存在于 schema
      status: 'COMPLETED',
      decision: validatedData.action === 'PUBLISH' ? 'APPROVED' : 'REJECTED',
      comments: `${actionMessage}方案`,
      reviewedAt: new Date(),
    }
  });

  return updatedSolution;
});
```

---

### 6. 公开展示

**文件**: `src/app/api/solutions/route.ts` (GET)

**查询条件**:
- 状态为 `PUBLISHED`
- 按 `published_at` 降序排列

**权限控制**:
- 公共用户只能查看 `PUBLISHED` 状态的方案
- CREATOR 可以查看自己创建的所有方案
- ADMIN/REVIEWER 可以查看所有方案

**关键代码**:
```typescript
// 权限控制
if (!isAuthenticated || (!isAdmin && !isReviewer && !isCreator)) {
  if (solution.status !== 'PUBLISHED') {
    return createErrorResponse('方案不存在或未发布', 404);
  }
}
```

---

## API 端点

### 创作者相关

| 方法 | 端点 | 功能 | 权限 |
|------|------|------|------|
| POST | `/api/solutions` | 创建方案 | CREATOR |
| GET | `/api/solutions/mine` | 获取我的方案列表 | CREATOR |
| GET | `/api/solutions/[id]` | 获取方案详情 | CREATOR (自己的) / PUBLIC (PUBLISHED) |
| PUT | `/api/solutions/[id]` | 更新方案 | CREATOR (自己的) |
| POST | `/api/solutions/[id]/submit` | 提交审核 | CREATOR (自己的) |
| POST | `/api/solutions/[id]/assets` | 上传资产 | CREATOR (自己的) |
| PUT | `/api/solutions/[id]/bom` | 更新 BOM | CREATOR (自己的) |

### 管理员相关

| 方法 | 端点 | 功能 | 权限 |
|------|------|------|------|
| GET | `/api/admin/solutions` | 获取方案列表（所有状态） | ADMIN/REVIEWER |
| GET | `/api/admin/solutions/[id]` | 获取方案详情 | ADMIN/REVIEWER |
| POST | `/api/admin/solutions/[id]/review` | 开始审核 | ADMIN |
| PUT | `/api/admin/solutions/[id]/review` | 完成审核 | ADMIN/REVIEWER |
| GET | `/api/admin/solutions/[id]/review` | 获取审核历史 | ADMIN/REVIEWER |
| POST | `/api/solutions/[id]/publish` | 发布/下架方案 | ADMIN |

---

## 数据模型

### Solution 模型

```prisma
model Solution {
  id            String         @id @default(cuid())
  title         String
  description   String
  category      String
  price         Decimal        @db.Decimal(10, 2)
  status        SolutionStatus @default(DRAFT)
  
  // 创作者关联
  creator_id    String         @map("creator_id")
  creator       CreatorProfile @relation(fields: [creator_id], references: [id])
  
  // 审核相关
  submitted_at  DateTime?      @map("submitted_at")
  reviewed_at   DateTime?      @map("reviewed_at")
  review_notes  String?        @map("review_notes")
  
  // 发布相关
  published_at  DateTime?      @map("published_at")
  archived_at  DateTime?      @map("archived_at")
  
  created_at    DateTime       @default(now()) @map("created_at")
  updated_at    DateTime       @updatedAt @map("updated_at")
  
  // 关联关系
  assets        SolutionAsset[]
  solutionReviews SolutionReview[]
}
```

### SolutionReview 模型

```prisma
model SolutionReview {
  id                String         @id @default(cuid())
  solution_id       String         @map("solution_id")
  reviewer_id       String         @map("reviewer_id")
  status            ReviewStatus
  score             Int?
  comments          String?
  quality_score     Int?           @map("quality_score")
  completeness      Int?
  innovation        Int?
  market_potential  Int?           @map("market_potential")
  decision          ReviewDecision
  decision_notes    String?        @map("decision_notes")
  suggestions       String[]
  review_started_at DateTime?      @map("review_started_at")
  reviewed_at       DateTime?      @map("reviewed_at")
  created_at        DateTime       @default(now()) @map("created_at")
  updated_at        DateTime       @updatedAt @map("updated_at")
  
  solution Solution @relation(fields: [solution_id], references: [id])
  
  @@map("solution_reviews")
}
```

**⚠️ 缺失字段**: `fromStatus` 和 `toStatus` 字段在代码中被使用，但 schema 中不存在。需要添加：

```prisma
from_status SolutionStatus @map("from_status")
to_status   SolutionStatus @map("to_status")
```

---

## 权限控制

### 角色定义

| 角色 | 权限 |
|------|------|
| `CREATOR` | 创建、编辑、提交自己的方案 |
| `REVIEWER` | 审核方案（批准/拒绝） |
| `ADMIN` | 所有权限，包括发布方案 |
| `SUPER_ADMIN` | 所有权限 |

### 权限检查函数

- `requireCreatorAuth()`: 验证 CREATOR 角色
- `requireReviewerAuth()`: 验证 REVIEWER 或 ADMIN 角色
- `requireAdminAuth()`: 验证 ADMIN 或 SUPER_ADMIN 角色

---

## 已知问题

### 1. SolutionReview 模型缺少 fromStatus 和 toStatus 字段

**问题**: 代码中使用了 `fromStatus` 和 `toStatus` 字段来记录状态转换，但 Prisma schema 中没有定义这些字段。

**影响**: 
- 创建审核记录时会失败
- 无法追踪状态转换历史

**解决方案**: 
1. 已在 `prisma/schema.prisma` 中添加了 `from_status` 和 `to_status` 字段
2. 由于使用 Supabase Session Pooler，不能直接运行 `prisma migrate`，需要手动执行 SQL

**执行步骤**:
1. 打开 Supabase Dashboard → SQL Editor
2. 执行 `prisma/add_status_transition_fields.sql` 文件中的 SQL 语句

**或者直接执行以下 SQL**:
```sql
-- 添加 from_status 字段（审核前的方案状态）
ALTER TABLE solution_reviews 
ADD COLUMN IF NOT EXISTS from_status SolutionStatus;

-- 添加 to_status 字段（审核后的方案状态）
ALTER TABLE solution_reviews 
ADD COLUMN IF NOT EXISTS to_status SolutionStatus;

-- 为现有记录设置默认值（可选）
UPDATE solution_reviews 
SET 
  from_status = 'PENDING_REVIEW',
  to_status = 'PENDING_REVIEW'
WHERE from_status IS NULL OR to_status IS NULL;
```

**注意**: PostgreSQL 使用 `--` 作为注释符号，不是 `#`。

### 2. 字段名不一致

**问题**: 部分代码使用了 camelCase（如 `submittedAt`），但 Prisma schema 使用 snake_case（如 `submitted_at`）。

**状态**: 已修复大部分，但需要持续检查。

### 3. 审核记录中的 reviewerId 问题

**问题**: 在提交审核时，`reviewerId` 被设置为提交者ID，而不是实际的审核员ID。

**影响**: 审核历史记录可能不准确。

**建议**: 在提交审核时，`reviewerId` 应该为 `null` 或使用特殊值，直到实际审核员开始审核。

---

## 总结

### 完整流程检查清单

- ✅ 创建方案（DRAFT）
- ✅ 编辑方案内容
- ✅ 提交审核（DRAFT/REJECTED → PENDING_REVIEW）
- ✅ 管理员审核（PENDING_REVIEW → APPROVED/REJECTED）
- ✅ 发布方案（APPROVED → PUBLISHED）
- ✅ 公开展示
- ⚠️ 状态转换历史记录（需要修复 schema）

### 需要修复的问题

1. **高优先级**: 添加 `fromStatus` 和 `toStatus` 字段到 `SolutionReview` 模型
2. **中优先级**: 修复提交审核时的 `reviewerId` 逻辑
3. **低优先级**: 统一字段命名规范检查

---

## 相关文件

### API 路由
- `src/app/api/solutions/route.ts` - 创建方案、获取方案列表
- `src/app/api/solutions/[id]/route.ts` - 获取/更新方案详情
- `src/app/api/solutions/[id]/submit/route.ts` - 提交审核
- `src/app/api/solutions/[id]/publish/route.ts` - 发布/下架方案
- `src/app/api/admin/solutions/[id]/review/route.ts` - 审核相关

### 业务逻辑
- `src/lib/solution-review.ts` - 审核逻辑
- `src/lib/solution-status-workflow.ts` - 状态转换规则
- `src/lib/creator-profile-utils.ts` - CreatorProfile 工具函数

### 前端页面
- `src/app/[locale]/creators/solutions/new/page.tsx` - 创建方案
- `src/app/[locale]/creators/solutions/page.tsx` - 方案列表
- `src/app/[locale]/admin/solutions/[id]/page.tsx` - 审核详情页

### 数据模型
- `prisma/schema.prisma` - 数据库 schema

---

**最后更新**: 2025-01-31


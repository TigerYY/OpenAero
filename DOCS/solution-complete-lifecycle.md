# 方案完整生命周期流程文档

**版本**: 2.0.0  
**最后更新**: 2025-01-31  
**功能**: 方案从创建、审批、修改、发布的全流程详细说明

---

## 目录

1. [流程概览](#流程概览)
2. [状态定义](#状态定义)
3. [详细流程](#详细流程)
4. [API 端点](#api-端点)
5. [数据模型](#数据模型)
6. [权限控制](#权限控制)
7. [特殊情况处理](#特殊情况处理)
8. [前端页面](#前端页面)

---

## 流程概览

### 完整状态流转图

```
                    ┌─────────┐
                    │  DRAFT  │ 草稿
                    └────┬────┘
                         │
                    ┌────▼──────────────────────────────┐
                    │  提交审核                         │
                    │  (POST /api/solutions/[id]/submit)│
                    └────┬──────────────────────────────┘
                         │
                    ┌────▼──────────────┐
                    │ PENDING_REVIEW    │ 待审核
                    └────┬──────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        │                │                │
   ┌────▼────┐    ┌─────▼─────┐    ┌────▼────┐
   │ APPROVED│    │ REJECTED  │    │NEEDS_   │ 需修改
   │ 已批准  │    │ 已拒绝    │    │REVISION │
   └────┬────┘    └─────┬─────┘    └────┬────┘
        │               │                │
        │               │                │
   ┌────▼────┐    ┌─────▼─────┐    ┌────▼────┐
   │PUBLISHED│    │  DRAFT     │    │PENDING_ │ 等待修改
   │ 已发布  │    │ (重新编辑) │    │REVIEW   │
   └────┬────┘    └─────┬─────┘    └────┬────┘
        │               │                │
        │               │                │
   ┌────▼────┐    ┌─────▼─────┐    ┌────▼────┐
   │ARCHIVED │    │ 重新提交   │    │ 修改后  │
   │ 已归档  │    │ 审核       │    │ 重新提交│
   └─────────┘    └────────────┘    └─────────┘
```

### 关键路径说明

1. **正常流程**: DRAFT → PENDING_REVIEW → APPROVED → PUBLISHED
2. **拒绝流程**: DRAFT → PENDING_REVIEW → REJECTED → DRAFT (重新编辑) → PENDING_REVIEW
3. **需修改流程**: DRAFT → PENDING_REVIEW → NEEDS_REVISION (决策) → PENDING_REVIEW (状态保持) → 修改 → 重新提交

---

## 状态定义

### SolutionStatus 枚举

```typescript
enum SolutionStatus {
  DRAFT           // 草稿：创作者正在编辑，未提交
  PENDING_REVIEW  // 待审核：已提交，等待管理员审核
  APPROVED        // 已批准：审核通过，等待发布
  REJECTED        // 已拒绝：审核未通过，创作者可以重新编辑
  PUBLISHED       // 已发布：已发布到市场，公开展示
  ARCHIVED        // 已归档：已下架，不再公开展示
}
```

### ReviewDecision 枚举

```typescript
enum ReviewDecision {
  PENDING         // 待处理：审核记录刚创建，还未完成
  APPROVED        // 批准：审核通过
  REJECTED        // 拒绝：审核未通过
  NEEDS_REVISION  // 需要修改：需要创作者修改后重新提交
}
```

### ReviewStatus 枚举

```typescript
enum ReviewStatus {
  PENDING         // 待开始：审核记录已创建，但审核员还未开始
  IN_PROGRESS     // 进行中：审核员正在审核
  COMPLETED       // 已完成：审核已完成
}
```

---

## 详细流程

### 1. 创建方案（DRAFT 状态）

**入口**: `/zh-CN/creators/solutions/new`  
**API**: `POST /api/solutions`

**流程步骤**:
1. 创作者填写方案基本信息（标题、描述、分类、价格）
2. 填写技术规格（JSON 格式，或通过结构化表单）
3. 添加应用场景和架构描述（支持多卡片输入）
4. 添加 BOM 清单（物料清单）
5. 上传资产文件（图片、文档、视频）
6. 保存草稿（可选，支持多个草稿）

**关键验证**:
- ✅ 用户必须为 CREATOR 角色
- ✅ 自动创建 CreatorProfile（如果不存在）
- ✅ 方案初始状态为 `DRAFT`
- ✅ 草稿可以保存不完整信息

**数据存储**:
- `Solution` 表：基本信息
- `SolutionFile` 表：资产文件
- `Solution.bom` 字段：BOM 清单（JSON 格式）
- `Solution.specs` 字段：技术规格、应用场景、架构描述（JSON 格式）

**前端页面**: `src/app/[locale]/creators/solutions/new/page.tsx`

---

### 2. 编辑方案（DRAFT/REJECTED/NEEDS_REVISION 状态）

**入口**: `/zh-CN/creators/solutions/[id]/edit`  
**API**: `PUT /api/solutions/[id]`

**允许编辑的状态**:
- ✅ `DRAFT`: 可以编辑所有字段
- ✅ `REJECTED`: 可以编辑所有字段，准备重新提交
- ✅ `NEEDS_REVISION`: 可以编辑所有字段，根据审核反馈修改

**不允许编辑的状态**:
- ❌ `PENDING_REVIEW`: 审核中，不允许编辑
- ❌ `APPROVED`: 已批准，需要发布后才能修改
- ❌ `PUBLISHED`: 已发布，需要下架后才能修改

**关键验证**:
```typescript
// 验证方案状态允许编辑
if (solution.status !== 'DRAFT' && 
    solution.status !== 'REJECTED' && 
    solution.status !== 'PENDING_REVIEW') { // PENDING_REVIEW 可能包含 NEEDS_REVISION
  // 检查是否有 NEEDS_REVISION 审核决定
  const hasNeedsRevision = await checkNeedsRevision(solutionId);
  if (!hasNeedsRevision) {
    return createErrorResponse('当前状态不允许编辑', 400);
  }
}

// 验证用户为方案所有者
if (solution.creator_id !== currentUserCreatorProfile.id) {
  return createErrorResponse('无权编辑此方案', 403);
}
```

**前端页面**: `src/app/[locale]/creators/solutions/[id]/edit/page.tsx`

---

### 3. 提交审核（DRAFT/REJECTED → PENDING_REVIEW）

**入口**: 方案编辑页面或方案列表页面  
**API**: `POST /api/solutions/[id]/submit`

**前置条件**:
1. ✅ 方案状态为 `DRAFT` 或 `REJECTED`
2. ✅ 用户为方案所有者（或 ADMIN/SUPER_ADMIN）
3. ✅ 必填字段完整：
   - `title`: 至少 5 个字符
   - `description`: 至少 20 个字符
   - `category`: 已选择
   - `price`: 有效价格
4. ✅ 至少上传一个资产文件
5. ✅ 至少添加一个 BOM 项（可选，根据业务需求）

**流程**:
1. 验证用户权限和方案状态
2. 验证方案完整性（使用 `submitSolutionSchema` 严格验证）
3. 使用事务更新方案状态并创建审核记录：
   ```typescript
   await prisma.$transaction(async (tx) => {
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
         solution_id: solutionId,
         reviewer_id: authResult.user.id, // 提交者ID
         from_status: oldStatus, // DRAFT 或 REJECTED
         to_status: 'PENDING_REVIEW',
         status: 'PENDING',
         decision: 'PENDING',
         comments: '方案已提交审核',
       }
     });

     return updatedSolution;
   });
   ```
4. 记录审计日志

**API 文件**: `src/app/api/solutions/[id]/submit/route.ts`

---

### 4. 管理员审核（PENDING_REVIEW → APPROVED/REJECTED/NEEDS_REVISION）

**入口**: `/zh-CN/admin/review-workbench`  
**API**: `PUT /api/admin/solutions/[id]/review`

**权限要求**:
- `REVIEWER` 或 `ADMIN` 角色

**审核流程**:

#### 4.1 开始审核（可选）

**API**: `POST /api/admin/solutions/[id]/review`

**功能**: 分配审核员，创建审核记录

```typescript
const review = await startReview(solutionId, reviewerId);
// 创建审核记录，状态为 IN_PROGRESS，decision 为 PENDING
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
  // ⚠️ 重要：NEEDS_REVISION 决策时，方案状态保持为 PENDING_REVIEW
  // 但审核记录的 decision 为 NEEDS_REVISION，to_status 也为 PENDING_REVIEW
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
      from_status: fromStatus,  // 审核前的状态
      to_status: newStatus,     // 审核后的状态
      score: data.score,
      comments: data.comments,
      reviewed_at: new Date(),
    },
  }),
  // 更新方案状态（NEEDS_REVISION 时状态不变）
  prisma.solution.update({
    where: { id: solutionId },
    data: {
      status: newStatus, // APPROVED, REJECTED, 或保持 PENDING_REVIEW
      reviewed_at: new Date(),
      review_notes: data.decisionNotes || data.comments || null,
    },
  }),
]);
```

**前端页面**: `src/app/[locale]/admin/review-workbench/page.tsx`

---

### 5. 需修改流程（NEEDS_REVISION）

**特殊说明**: `NEEDS_REVISION` 是一个审核决策（`ReviewDecision`），不是方案状态（`SolutionStatus`）。

**流程**:
1. 管理员审核时选择 `NEEDS_REVISION` 决策
2. 方案状态保持为 `PENDING_REVIEW`（不改变）
3. 审核记录中：
   - `decision`: `NEEDS_REVISION`
   - `status`: `COMPLETED`
   - `from_status`: `PENDING_REVIEW`
   - `to_status`: `PENDING_REVIEW`
   - `comments`: 包含修改建议

**创作者端显示**:
- 在方案列表中，通过查询审核记录判断是否为"需修改"状态
- 如果最新的已完成审核记录的 `decision` 为 `NEEDS_REVISION` 或 `PENDING`，且没有后续的 `APPROVED` 审核，则显示为 `NEEDS_REVISION` 状态
- 显示审核反馈信息（评论和建议）
- 显示"修改方案"按钮和"重新提交审核"按钮

**API 查询逻辑**:
```typescript
// 查询有 NEEDS_REVISION 或 PENDING 审核决定的方案（已完成状态）
where.solutionReviews = {
  some: {
    OR: [
      { decision: 'NEEDS_REVISION', status: 'COMPLETED' },
      { decision: 'PENDING', status: 'COMPLETED' }
    ]
  }
};

// 在格式化响应时，检查审核记录
const needsRevisionReview = reviews.find((r: any) => 
  (r.decision === 'NEEDS_REVISION' || r.decision === 'PENDING') && 
  r.status === 'COMPLETED'
);
if (needsRevisionReview && !hasNewerApproved) {
  displayStatus = 'NEEDS_REVISION';
}
```

**前端页面**: `src/components/creators/SolutionsList.tsx`

---

### 6. 修改并重新提交（NEEDS_REVISION → PENDING_REVIEW）

**流程**:
1. 创作者查看审核反馈
2. 点击"修改方案"按钮，进入编辑页面
3. 根据审核反馈修改方案内容
4. 保存修改（可以保存为草稿）
5. 点击"重新提交审核"按钮
6. 方案状态保持为 `PENDING_REVIEW`，但创建新的审核记录

**关键点**:
- 方案状态在 `NEEDS_REVISION` 决策后保持为 `PENDING_REVIEW`
- 重新提交时，创建新的审核记录，`from_status` 和 `to_status` 都是 `PENDING_REVIEW`
- 新的审核记录 `decision` 为 `PENDING`，等待管理员重新审核

---

### 7. 发布方案（APPROVED → PUBLISHED）

**入口**: 管理员审核工作台或方案管理页面  
**API**: `POST /api/solutions/[id]/publish`

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
  timestampField = 'published_at';
} else {
  // 下架：验证状态为 PUBLISHED
  if (solution.status !== 'PUBLISHED') {
    return createErrorResponse('只有已发布的方案可以下架', 400);
  }
  newStatus = 'ARCHIVED';
  timestampField = 'archived_at';
}

// 使用事务更新方案状态并创建审核记录
await prisma.$transaction(async (tx) => {
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
      solution_id: id,
      reviewer_id: authResult.user.id,
      from_status: solution.status,
      to_status: newStatus,
      status: 'COMPLETED',
      decision: validatedData.action === 'PUBLISH' ? 'APPROVED' : 'REJECTED',
      comments: `${actionMessage}方案`,
      reviewed_at: new Date(),
    }
  });

  return updatedSolution;
});
```

**API 文件**: `src/app/api/solutions/[id]/publish/route.ts`

---

### 8. 公开展示（PUBLISHED 状态）

**入口**: `/zh-CN/solutions` 或 `/zh-CN/solutions/[id]`  
**API**: `GET /api/solutions` 或 `GET /api/solutions/[id]`

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
  where.status = 'PUBLISHED'; // 只查询已发布的方案
} else {
  // 管理员/审核员/创作者可以筛选状态
  if (status && status !== 'all') {
    where.status = status.toUpperCase();
  }
}
```

**前端页面**: 
- `src/app/[locale]/solutions/page.tsx` - 方案列表
- `src/app/[locale]/solutions/[id]/page.tsx` - 方案详情

---

## API 端点

### 创作者相关

| 方法 | 端点 | 功能 | 权限 | 状态要求 |
|------|------|------|------|----------|
| POST | `/api/solutions` | 创建方案 | CREATOR | - |
| GET | `/api/solutions/mine` | 获取我的方案列表 | CREATOR | 所有状态 |
| GET | `/api/solutions/[id]` | 获取方案详情 | CREATOR (自己的) / PUBLIC (PUBLISHED) | - |
| PUT | `/api/solutions/[id]` | 更新方案 | CREATOR (自己的) | DRAFT, REJECTED, NEEDS_REVISION |
| POST | `/api/solutions/[id]/submit` | 提交审核 | CREATOR (自己的) | DRAFT, REJECTED |
| POST | `/api/solutions/[id]/assets` | 上传资产 | CREATOR (自己的) | DRAFT, REJECTED, NEEDS_REVISION |
| PUT | `/api/solutions/[id]/bom` | 更新 BOM | CREATOR (自己的) | DRAFT, REJECTED, NEEDS_REVISION |

### 管理员相关

| 方法 | 端点 | 功能 | 权限 | 状态要求 |
|------|------|------|------|----------|
| GET | `/api/admin/solutions` | 获取方案列表（所有状态） | ADMIN/REVIEWER | 所有状态 |
| GET | `/api/admin/solutions/[id]` | 获取方案详情 | ADMIN/REVIEWER | 所有状态 |
| POST | `/api/admin/solutions/[id]/review` | 开始审核 | ADMIN | PENDING_REVIEW |
| PUT | `/api/admin/solutions/[id]/review` | 完成审核 | ADMIN/REVIEWER | PENDING_REVIEW |
| GET | `/api/admin/solutions/[id]/review` | 获取审核历史 | ADMIN/REVIEWER / CREATOR (自己的) | 所有状态 |
| POST | `/api/solutions/[id]/publish` | 发布/下架方案 | ADMIN | APPROVED (发布) / PUBLISHED (下架) |

### 公共访问

| 方法 | 端点 | 功能 | 权限 | 状态要求 |
|------|------|------|------|----------|
| GET | `/api/solutions` | 获取方案列表 | PUBLIC | PUBLISHED |
| GET | `/api/solutions/[id]` | 获取方案详情 | PUBLIC | PUBLISHED |

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
  archived_at  DateTime?       @map("archived_at")
  
  // JSON 字段
  specs         Json?          // 技术规格、应用场景、架构描述
  bom           Json?          // BOM 清单
  features      String[]       // 功能特性
  tags          String[]       // 标签
  images        String[]       // 图片URL列表
  
  created_at    DateTime       @default(now()) @map("created_at")
  updated_at    DateTime       @updatedAt @map("updated_at")
  
  // 关联关系
  files         SolutionFile[]
  solutionReviews SolutionReview[]
  
  @@map("solutions")
}
```

### SolutionReview 模型

```prisma
model SolutionReview {
  id                String         @id @default(cuid())
  solution_id       String         @map("solution_id")
  reviewer_id       String         @map("reviewer_id")
  status            ReviewStatus
  from_status       SolutionStatus @map("from_status")  // 审核前的方案状态
  to_status         SolutionStatus @map("to_status")    // 审核后的方案状态
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

  solution Solution @relation(fields: [solution_id], references: [id], onDelete: Cascade)

  @@map("solution_reviews")
}
```

### SolutionFile 模型

```prisma
model SolutionFile {
  id            String     @id @default(cuid())
  solution_id   String     @map("solution_id")
  file_type     String     @map("file_type")
  filename      String
  original_name String?    @map("original_name")
  url           String
  path          String?
  mime_type     String?    @map("mime_type")
  size          Int?
  checksum      String     // MD5 校验和
  uploaded_by   String     @map("uploaded_by")
  status        FileStatus @default(ACTIVE)
  created_at    DateTime   @default(now()) @map("created_at")
  updated_at    DateTime   @updatedAt @map("updated_at")

  solution Solution @relation(fields: [solution_id], references: [id], onDelete: Cascade)

  @@map("solution_files")
}
```

---

## 权限控制

### 角色定义

| 角色 | 权限 |
|------|------|
| `CREATOR` | 创建、编辑、提交自己的方案；查看自己的方案审核历史 |
| `REVIEWER` | 审核方案（批准/拒绝/需修改） |
| `ADMIN` | 所有权限，包括发布方案、开始审核 |
| `SUPER_ADMIN` | 所有权限 |
| `USER` | 仅查看已发布的方案 |

### 权限检查函数

- `requireCreatorAuth()`: 验证 CREATOR 角色
- `requireReviewerAuth()`: 验证 REVIEWER 或 ADMIN 角色
- `requireAdminAuth()`: 验证 ADMIN 或 SUPER_ADMIN 角色

### 状态编辑权限

| 方案状态 | CREATOR 可编辑 | ADMIN 可编辑 | 说明 |
|---------|---------------|--------------|------|
| `DRAFT` | ✅ | ✅ | 草稿状态，可以编辑 |
| `REJECTED` | ✅ | ✅ | 已拒绝，可以重新编辑 |
| `PENDING_REVIEW` | ❌* | ✅ | 审核中，通常不可编辑（*如果有 NEEDS_REVISION 决策，可以编辑） |
| `APPROVED` | ❌ | ✅ | 已批准，需要发布后才能修改 |
| `PUBLISHED` | ❌ | ✅ | 已发布，需要下架后才能修改 |
| `ARCHIVED` | ❌ | ✅ | 已归档，可以恢复 |

---

## 特殊情况处理

### 1. NEEDS_REVISION 状态识别

**问题**: `NEEDS_REVISION` 是审核决策，不是方案状态。方案状态在 `NEEDS_REVISION` 决策后仍为 `PENDING_REVIEW`。

**解决方案**:
- 在查询方案列表时，通过审核记录判断是否为"需修改"状态
- 查询条件：`decision === 'NEEDS_REVISION' || decision === 'PENDING'` 且 `status === 'COMPLETED'`
- 在格式化响应时，将状态映射为 `NEEDS_REVISION` 以便前端显示

**实现位置**:
- `src/app/api/solutions/mine/route.ts` - 创作者方案列表
- `src/app/[locale]/admin/review-workbench/page.tsx` - 管理员审核工作台

### 2. PENDING 决策处理

**问题**: 数据库中审核记录的 `decision` 字段可能为 `PENDING`（而不是 `NEEDS_REVISION`）。

**解决方案**:
- 同时检查 `NEEDS_REVISION` 和 `PENDING` 决策
- 确保审核记录的状态为 `COMPLETED`
- 在查询和显示时统一处理

**实现位置**:
- `src/app/api/solutions/mine/route.ts` - 查询逻辑已更新

### 3. 状态转换历史记录

**功能**: 通过 `from_status` 和 `to_status` 字段记录每次状态转换。

**用途**:
- 审核历史追踪
- 状态变更审计
- 流程分析

**实现位置**:
- `src/lib/solution-review.ts` - 审核逻辑
- `src/app/api/admin/solutions/[id]/review/route.ts` - 审核 API

---

## 前端页面

### 创作者端

| 页面路径 | 功能 | 文件 |
|---------|------|------|
| `/zh-CN/creators/solutions/new` | 创建新方案 | `src/app/[locale]/creators/solutions/new/page.tsx` |
| `/zh-CN/creators/solutions/[id]/edit` | 编辑方案 | `src/app/[locale]/creators/solutions/[id]/edit/page.tsx` |
| `/zh-CN/creators/dashboard?tab=solutions` | 方案列表 | `src/components/creators/SolutionsList.tsx` |

### 管理员端

| 页面路径 | 功能 | 文件 |
|---------|------|------|
| `/zh-CN/admin/review-workbench` | 审核工作台 | `src/app/[locale]/admin/review-workbench/page.tsx` |
| `/zh-CN/admin/solutions` | 方案管理 | `src/app/[locale]/admin/solutions/page.tsx` |

### 公共访问

| 页面路径 | 功能 | 文件 |
|---------|------|------|
| `/zh-CN/solutions` | 方案列表（已发布） | `src/app/[locale]/solutions/page.tsx` |
| `/zh-CN/solutions/[id]` | 方案详情（已发布） | `src/app/[locale]/solutions/[id]/page.tsx` |

---

## 完整流程示例

### 示例 1: 正常流程

```
1. 创作者创建方案 (DRAFT)
   → POST /api/solutions
   → 状态: DRAFT

2. 创作者编辑方案内容
   → PUT /api/solutions/[id]
   → 状态: DRAFT

3. 创作者提交审核
   → POST /api/solutions/[id]/submit
   → 状态: DRAFT → PENDING_REVIEW
   → 创建审核记录: from_status=DRAFT, to_status=PENDING_REVIEW, decision=PENDING

4. 管理员审核通过
   → PUT /api/admin/solutions/[id]/review
   → 状态: PENDING_REVIEW → APPROVED
   → 更新审核记录: from_status=PENDING_REVIEW, to_status=APPROVED, decision=APPROVED

5. 管理员发布方案
   → POST /api/solutions/[id]/publish
   → 状态: APPROVED → PUBLISHED
   → 创建审核记录: from_status=APPROVED, to_status=PUBLISHED, decision=APPROVED
```

### 示例 2: 需修改流程

```
1. 创作者创建方案 (DRAFT)
   → POST /api/solutions
   → 状态: DRAFT

2. 创作者提交审核
   → POST /api/solutions/[id]/submit
   → 状态: DRAFT → PENDING_REVIEW

3. 管理员审核，决定需修改
   → PUT /api/admin/solutions/[id]/review
   → 状态: PENDING_REVIEW → PENDING_REVIEW (保持不变)
   → 更新审核记录: from_status=PENDING_REVIEW, to_status=PENDING_REVIEW, decision=NEEDS_REVISION

4. 创作者查看审核反馈
   → GET /api/solutions/mine?status=NEEDS_REVISION
   → 显示状态: NEEDS_REVISION (通过审核记录判断)
   → 显示审核反馈: comments, suggestions

5. 创作者修改方案
   → PUT /api/solutions/[id]
   → 状态: PENDING_REVIEW (保持不变)

6. 创作者重新提交审核
   → POST /api/solutions/[id]/submit
   → 状态: PENDING_REVIEW (保持不变)
   → 创建新审核记录: from_status=PENDING_REVIEW, to_status=PENDING_REVIEW, decision=PENDING

7. 管理员重新审核通过
   → PUT /api/admin/solutions/[id]/review
   → 状态: PENDING_REVIEW → APPROVED
   → 更新审核记录: from_status=PENDING_REVIEW, to_status=APPROVED, decision=APPROVED
```

### 示例 3: 拒绝流程

```
1. 创作者创建方案 (DRAFT)
   → POST /api/solutions
   → 状态: DRAFT

2. 创作者提交审核
   → POST /api/solutions/[id]/submit
   → 状态: DRAFT → PENDING_REVIEW

3. 管理员审核拒绝
   → PUT /api/admin/solutions/[id]/review
   → 状态: PENDING_REVIEW → REJECTED
   → 更新审核记录: from_status=PENDING_REVIEW, to_status=REJECTED, decision=REJECTED

4. 创作者重新编辑
   → PUT /api/solutions/[id]
   → 状态: REJECTED (可以编辑)

5. 创作者重新提交审核
   → POST /api/solutions/[id]/submit
   → 状态: REJECTED → PENDING_REVIEW
   → 创建新审核记录: from_status=REJECTED, to_status=PENDING_REVIEW, decision=PENDING
```

---

## 关键注意事项

### 1. 状态与决策的区别

- **方案状态** (`SolutionStatus`): 方案在系统中的实际状态
- **审核决策** (`ReviewDecision`): 审核员对方案的审核决定
- **需修改情况**: `NEEDS_REVISION` 是决策，不是状态。方案状态保持为 `PENDING_REVIEW`

### 2. 状态转换规则

- `DRAFT` → `PENDING_REVIEW`: 只能由 CREATOR 提交
- `PENDING_REVIEW` → `APPROVED/REJECTED`: 只能由 REVIEWER/ADMIN 审核
- `PENDING_REVIEW` → `PENDING_REVIEW`: 当决策为 `NEEDS_REVISION` 时
- `APPROVED` → `PUBLISHED`: 只能由 ADMIN 发布
- `REJECTED` → `DRAFT`: CREATOR 可以重新编辑

### 3. 审核记录的作用

- 记录每次状态转换的详细信息
- 通过 `from_status` 和 `to_status` 追踪状态变更历史
- 通过 `decision` 记录审核决定
- 通过 `comments` 和 `suggestions` 提供反馈

### 4. 权限边界

- CREATOR 只能操作自己的方案
- REVIEWER 可以审核所有方案，但不能发布
- ADMIN 拥有所有权限，包括发布和下架

---

## 相关文件

### API 路由
- `src/app/api/solutions/route.ts` - 创建方案、获取方案列表
- `src/app/api/solutions/[id]/route.ts` - 获取/更新方案详情
- `src/app/api/solutions/[id]/submit/route.ts` - 提交审核
- `src/app/api/solutions/[id]/publish/route.ts` - 发布/下架方案
- `src/app/api/solutions/[id]/assets/route.ts` - 资产管理
- `src/app/api/solutions/[id]/bom/route.ts` - BOM 管理
- `src/app/api/solutions/mine/route.ts` - 获取创作者方案列表
- `src/app/api/admin/solutions/[id]/review/route.ts` - 审核相关

### 业务逻辑
- `src/lib/solution-review.ts` - 审核逻辑
- `src/lib/solution-status-workflow.ts` - 状态转换规则
- `src/lib/creator-profile-utils.ts` - CreatorProfile 工具函数
- `src/lib/validations.ts` - 验证规则

### 前端页面
- `src/app/[locale]/creators/solutions/new/page.tsx` - 创建方案
- `src/app/[locale]/creators/solutions/[id]/edit/page.tsx` - 编辑方案
- `src/app/[locale]/creators/dashboard/page.tsx` - 创作者仪表板
- `src/components/creators/SolutionsList.tsx` - 方案列表组件
- `src/app/[locale]/admin/review-workbench/page.tsx` - 审核工作台
- `src/app/[locale]/solutions/page.tsx` - 公共方案列表
- `src/app/[locale]/solutions/[id]/page.tsx` - 公共方案详情

### 数据模型
- `prisma/schema.prisma` - 数据库 schema

---

**最后更新**: 2025-01-31  
**维护者**: OpenAero 开发团队


# 审核 API 增强总结

## 实施时间
2025-01-XX

## 增强内容

### ✅ 1. `startReview` 函数增强

**文件**: `src/lib/solution-review.ts`

**变更**:
- ✅ 在创建审核记录时，记录 `fromStatus`（审核前的方案状态）
- ✅ 设置 `toStatus` 初始值为当前状态（完成审核时会更新）

**代码示例**:
```typescript
const review = await prisma.solutionReview.create({
  data: {
    solutionId,
    reviewerId,
    status: ReviewStatus.IN_PROGRESS,
    decision: ReviewDecision.PENDING,
    fromStatus: solution.status, // **新增**：记录审核前的状态
    toStatus: solution.status, // 初始值设为当前状态，完成审核时会更新
    reviewStartedAt: new Date(),
  },
});
```

### ✅ 2. `completeReview` 函数增强

**文件**: `src/lib/solution-review.ts`

**变更**:
- ✅ 获取审核前的状态（优先使用审核记录中已记录的 `fromStatus`）
- ✅ 确定审核后的状态（`toStatus`）基于 `decision`
- ✅ 使用事务更新审核记录和方案状态
- ✅ 在更新审核记录时，同时更新 `fromStatus` 和 `toStatus`
- ✅ 更新方案的 `lastReviewedAt` 时间戳

**状态转换逻辑**:
- `APPROVED` → `APPROVED`
- `REJECTED` → `REJECTED`
- `NEEDS_REVISION` → `PENDING_REVIEW`（保持待审核状态，等待修改）

**代码示例**:
```typescript
// 使用事务更新审核记录和方案状态
const [updatedReviewRecord, updatedSolution] = await prisma.$transaction([
  // 更新审核记录（包含 fromStatus/toStatus）
  prisma.solutionReview.update({
    where: { id: review.id },
    data: {
      status: ReviewStatus.COMPLETED,
      decision: data.decision,
      fromStatus: fromStatus, // **新增**：记录审核前的状态
      toStatus: newStatus, // **新增**：记录审核后的状态
      // ... 其他字段
    },
  }),
  // 更新方案状态和 lastReviewedAt
  prisma.solution.update({
    where: { id: solutionId },
    data: {
      status: newStatus,
      reviewedAt: new Date(),
      lastReviewedAt: new Date(), // **新增**：更新最后审核时间
      reviewNotes: data.decisionNotes || data.comments || null,
    },
  }),
]);
```

### ✅ 3. `getSolutionReviewHistory` 函数增强

**文件**: `src/lib/solution-review.ts`

**变更**:
- ✅ 返回的审核历史记录包含 `fromStatus` 和 `toStatus` 字段

**代码示例**:
```typescript
return reviews.map((review) => ({
  ...review,
  fromStatus: review.fromStatus, // **新增**：包含 fromStatus
  toStatus: review.toStatus, // **新增**：包含 toStatus
  reviewer: {
    id: review.reviewerId,
    firstName: reviewerMap.get(review.reviewerId)?.firstName || null,
    lastName: reviewerMap.get(review.reviewerId)?.lastName || null,
  },
})) as ReviewWithDetails[];
```

### ✅ 4. `ReviewWithDetails` 接口增强

**文件**: `src/lib/solution-review.ts`

**变更**:
- ✅ 添加 `fromStatus: SolutionStatus` 字段
- ✅ 添加 `toStatus: SolutionStatus` 字段

### ✅ 5. `GET /api/admin/solutions/[id]/review` API 增强

**文件**: `src/app/api/admin/solutions/[id]/review/route.ts`

**变更**:
- ✅ 允许 CREATOR 查看自己方案的审核历史（权限增强）
- ✅ 格式化返回数据，确保包含 `fromStatus/toStatus` 信息
- ✅ 所有时间字段转换为 ISO 字符串格式

**权限控制**:
- ADMIN/SUPER_ADMIN：可以查看所有方案的审核历史
- CREATOR：可以查看自己创建方案的审核历史

**代码示例**:
```typescript
// **新增**：格式化返回数据，确保包含 fromStatus/toStatus
const formattedHistory = history.map(review => ({
  id: review.id,
  solutionId: review.solutionId,
  reviewerId: review.reviewerId,
  status: review.status,
  fromStatus: review.fromStatus, // **新增**：审核前状态
  toStatus: review.toStatus, // **新增**：审核后状态
  // ... 其他字段
}));
```

## 数据流

### 审核流程

1. **开始审核** (`startReview`):
   - 方案状态: `PENDING_REVIEW`
   - 创建审核记录: `fromStatus = PENDING_REVIEW`, `toStatus = PENDING_REVIEW`

2. **完成审核** (`completeReview`):
   - 获取审核前状态: `fromStatus = PENDING_REVIEW`（从审核记录或方案获取）
   - 确定审核后状态: `toStatus = APPROVED/REJECTED/PENDING_REVIEW`（基于 decision）
   - 更新审核记录: 设置 `fromStatus` 和 `toStatus`
   - 更新方案状态: 设置为 `toStatus`
   - 更新 `lastReviewedAt`: 设置为当前时间

3. **查看审核历史** (`getSolutionReviewHistory`):
   - 返回所有审核记录，包含 `fromStatus` 和 `toStatus`

## 状态转换示例

### 示例 1: 审核通过
```
开始审核: fromStatus = PENDING_REVIEW, toStatus = PENDING_REVIEW
完成审核: fromStatus = PENDING_REVIEW, toStatus = APPROVED
方案状态: PENDING_REVIEW → APPROVED
```

### 示例 2: 审核拒绝
```
开始审核: fromStatus = PENDING_REVIEW, toStatus = PENDING_REVIEW
完成审核: fromStatus = PENDING_REVIEW, toStatus = REJECTED
方案状态: PENDING_REVIEW → REJECTED
```

### 示例 3: 需要修改
```
开始审核: fromStatus = PENDING_REVIEW, toStatus = PENDING_REVIEW
完成审核: fromStatus = PENDING_REVIEW, toStatus = PENDING_REVIEW
方案状态: PENDING_REVIEW → PENDING_REVIEW（保持不变）
```

## 测试建议

1. **测试开始审核**:
   - 验证 `fromStatus` 正确记录为方案当前状态
   - 验证 `toStatus` 初始值正确

2. **测试完成审核**:
   - 验证 `fromStatus` 正确记录为审核前状态
   - 验证 `toStatus` 正确记录为审核后状态
   - 验证方案状态正确更新
   - 验证 `lastReviewedAt` 正确更新

3. **测试审核历史**:
   - 验证返回的审核历史包含 `fromStatus` 和 `toStatus`
   - 验证 CREATOR 可以查看自己方案的审核历史
   - 验证 ADMIN 可以查看所有方案的审核历史

## 相关文件

- `src/lib/solution-review.ts` - 审核逻辑实现
- `src/app/api/admin/solutions/[id]/review/route.ts` - 审核 API 路由
- `prisma/schema.prisma` - 数据库模型（已包含 `fromStatus` 和 `toStatus` 字段）

## 下一步

- ✅ 审核 API 增强完成
- ⏳ 实现前端页面展示审核历史和状态转换
- ⏳ 添加审核历史可视化组件


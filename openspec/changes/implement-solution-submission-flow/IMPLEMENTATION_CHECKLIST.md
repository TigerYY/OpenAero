# 实施前检查清单

## 1. 数据库 Schema 检查

### 1.1 Solution 模型字段确认 ✅ **已完成**
- [x] **确认 creatorId 字段状态** ✅ **已完成**
  - 当前代码中使用了 `solution.creatorId`（见 `src/app/api/solutions/[id]/route.ts:73`）
  - ✅ **已添加**：`creatorId String?` 字段到 Solution 模型（`prisma/schema.prisma:227`）
  - ✅ **数据库迁移**：已通过 SQL 迁移添加 `creatorId UUID` 字段到 `solutions` 表
  - ✅ **关联**：关联到 `CreatorProfile.id`，使用 `onDelete: SetNull`（允许历史数据）

- [x] **确认 creator 关联关系** ✅ **已完成**
  - 当前代码中使用了 `solution.creator`（见 `src/app/api/solutions/[id]/route.ts:74`）
  - ✅ **已添加**：`creator CreatorProfile? @relation(...)` 关联到 Solution 模型（`prisma/schema.prisma:241`）
  - ✅ **已添加**：`solutions Solution[]` 反向关联到 CreatorProfile 模型（`prisma/schema.prisma:106`）

**Schema 变更详情**：
```prisma
// Solution 模型新增
creatorId   String?  // 创作者ID（关联到 CreatorProfile.id，Prisma 中为 String，数据库为 UUID）
creator     CreatorProfile? @relation(fields: [creatorId], references: [id], onDelete: SetNull)

// CreatorProfile 模型新增
solutions   Solution[]  // 创作者创建的方案列表
```

**数据库迁移**：
- ✅ 迁移文件：`supabase/migrations/009_add_solution_creator_relation.sql`
- ✅ 已执行：字段类型为 `UUID`，外键约束已创建
- ✅ 索引已创建：`solutions_creatorId_idx`
- ⚠️ **注意**: Prisma generate 遇到跨 schema 问题，但不影响数据库字段使用
- ✅ **验证**: 数据库字段已成功添加，可以直接使用 `creatorId` 字段

### 1.2 现有字段检查 ✅ **已完成**
- [x] `submittedAt DateTime?` - 已存在
- [x] `reviewedAt DateTime?` - 已存在（保留作为向后兼容）
- [x] `reviewNotes String?` - 已存在
- [x] `bom Json?` - 已存在，**将移除**（数据为空，无需保留）
- [x] `specs Json?` - 已存在，**将移除**（由 technicalSpecs 替代）

### 1.3 需要添加的字段 ✅ **已完成**
- [x] `summary String? @db.Text` - 方案摘要 ✅ **已添加**
- [x] `tags String[]` - 标签（独立于 features）✅ **已添加**
- [x] `locale String @default("zh-CN")` - 语言 ✅ **已添加**
- [x] `technicalSpecs Json?` - 技术规格（替代 specs）✅ **已添加**
- [x] `useCases Json?` - 应用场景 ✅ **已添加**
- [x] `architecture Json?` - 架构图 ✅ **已添加**
- [x] `lastReviewedAt DateTime?` - 最后审核时间 ✅ **已添加**
- [x] `publishedAt DateTime?` - 发布时间 ✅ **已添加**
- [x] `archivedAt DateTime?` - 归档时间 ✅ **已添加**

**重要说明**：由于数据为空，本次重构**不保留** `bom Json?` 和 `specs Json?` 字段，直接使用 SolutionBomItem 和 technicalSpecs。

## 2. 现有 API 检查

### 2.1 已存在的 API
- [x] `POST /api/solutions/[id]/submit` - 已存在
  - 文件：`src/app/api/solutions/[id]/submit/route.ts`
  - 使用：`solutionService.submitForReview`
  - **需要增强**：添加状态转换记录、统一响应格式

- [x] `PUT /api/admin/solutions/[id]/review` - 已存在
  - 文件：`src/app/api/admin/solutions/[id]/review/route.ts`
  - 使用：`completeReview` 函数
  - **需要增强**：添加 fromStatus/toStatus 字段

- [x] `GET /api/admin/solutions` - 已存在
  - 文件：`src/app/api/admin/solutions/route.ts`
  - **需要增强**：包含 SolutionAsset 和 SolutionBomItem 信息

- [x] `GET /api/admin/solutions/[id]/review` (GET) - 已存在
  - 文件：`src/app/api/admin/solutions/[id]/review/route.ts`
  - 使用：`getSolutionReviewHistory`
  - **需要增强**：添加 CREATOR 权限、包含 fromStatus/toStatus

- [x] `GET /api/solutions` - 已存在
  - 文件：`src/app/api/solutions/route.ts`
  - **需要增强**：权限控制、状态过滤

- [x] `GET /api/solutions/[id]` - 已存在
  - 文件：`src/app/api/solutions/[id]/route.ts`
  - **需要增强**：权限控制、包含 SolutionAsset 和 SolutionBomItem

### 2.2 需要新建的 API
- [ ] `POST /api/solutions/:id/publish` - 发布/下架
- [ ] `PUT /api/solutions/:id/bom` - BOM 管理
- [ ] `POST /api/solutions/:id/assets` - 资产管理
- [ ] `GET /api/solutions/mine` - 创作者方案列表

## 3. 现有前端页面检查

### 3.1 已存在的页面
- [x] `/[locale]/admin/solutions` - 已存在
  - 文件：`src/app/[locale]/admin/solutions/page.tsx`
  - **需要增强**：显示 SolutionAsset 和 SolutionBomItem

### 3.2 需要新建的页面
- [ ] `/[locale]/creator/solutions` - 创作者方案列表
- [ ] `/[locale]/creator/solutions/new` - 新建方案
- [ ] `/[locale]/creator/solutions/[id]/edit` - 编辑方案
- [ ] `/[locale]/solutions/[id]` - 公共详情页

## 4. 数据迁移策略

### 4.1 BOM 数据迁移
- [ ] 创建迁移脚本 `scripts/migrate-bom-to-table.ts`
- [ ] 读取现有 `Solution.bom` JSON 字段
- [ ] 转换为 `SolutionBomItem` 记录
- [ ] 验证数据完整性
- [ ] 提供回滚方案

### 4.2 双写策略（过渡期）
- [ ] BOM API：同时写入 `SolutionBomItem` 和 JSON 字段
- [ ] 读取 API：优先使用 `SolutionBomItem`，fallback 到 JSON
- [ ] 添加配置开关控制双写行为

## 5. 权限验证函数

### 5.1 需要实现的函数
- [ ] `canEditSolution(solution, user)` - 检查是否可以编辑
- [ ] `canReviewSolution(solution, user)` - 检查是否可以审核
- [ ] `canPublishSolution(solution, user)` - 检查是否可以发布
- [ ] `canViewSolution(solution, user)` - 检查是否可以查看

### 5.2 现有函数检查
- [x] `isValidStatusTransition` - 已存在（`src/lib/solution-status-workflow.ts`）
- [x] `validateSolutionCompleteness` - 已存在（`src/lib/solution-status-workflow.ts`）

## 6. SolutionReview 模型增强

### 6.1 需要添加的字段
- [ ] `fromStatus SolutionStatus` - 源状态
- [ ] `toStatus SolutionStatus` - 目标状态

### 6.2 现有字段检查
- [x] `reviewerId String` - 已存在
- [x] `decision ReviewDecision` - 已存在
- [x] `comments String?` - 已存在
- [x] `score Int?` - 已存在
- [x] `qualityScore Int?` - 已存在
- [x] `completeness Int?` - 已存在
- [x] `innovation Int?` - 已存在
- [x] `marketPotential Int?` - 已存在

## 7. 关键决策点

### 7.1 creatorId 字段处理
**问题**：代码中使用了 `solution.creatorId`，但 schema 中没有定义
**选项**：
1. 添加 `creatorId String` 字段，关联到 `CreatorProfile.id`
2. 通过 `CreatorProfile.user_id` 关联到 `UserProfile.user_id`
3. 添加 `creator CreatorProfile? @relation(...)` 关联

**建议**：选项 1 + 选项 3（同时添加字段和关联）

### 7.2 BOM 数据迁移时机
**选项**：
1. Phase 1：立即迁移所有数据
2. Phase 4：渐进式迁移，先双写，后迁移

**建议**：选项 2（渐进式迁移，降低风险）

### 7.3 状态转换记录
**问题**：提交审核时是否需要创建 SolutionReview 记录？
**选项**：
1. 创建记录，fromStatus=DRAFT, toStatus=PENDING_REVIEW, reviewerId=creatorId
2. 不创建记录，仅在审核时创建

**建议**：选项 1（完整的状态转换历史）

## 8. 实施顺序建议

1. **Phase 1**: 数据库 Schema 更新（添加 creatorId、新字段、新模型）
2. **Phase 2**: 修复现有代码中的 creatorId 引用问题
3. **Phase 3**: 实现新建 API（publish, bom, assets, mine）
4. **Phase 4**: 增强现有 API（添加状态转换记录、权限控制）
5. **Phase 5**: 实现前端页面
6. **Phase 6**: 数据迁移脚本和双写策略
7. **Phase 7**: 测试和优化

## 9. 风险评估

### 高风险项
- ⚠️ **creatorId 字段缺失**：可能导致现有代码报错
- ⚠️ **BOM 数据迁移**：可能丢失数据或导致不一致

### 中风险项
- ⚠️ **状态转换记录**：需要确保所有状态变更都记录
- ⚠️ **权限控制**：需要确保所有 API 都有正确的权限检查

### 低风险项
- ✅ **前端页面**：新建页面，不影响现有功能
- ✅ **新 API**：新增功能，不影响现有 API


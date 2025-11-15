# 实现方案提交审核发布全流程 - 提案文档（重构版）

## Why
当前系统已有基础的 Solution 模型和部分 API，但缺少完整的方案提交、审核、发布全流程。参考 `DOCS/development/solution-submission-flow-spec.md` 规范文档，需要实现：
- 创作者端：方案创建、编辑、提交审核的完整流程
- 审核端：审核者审核方案（通过/驳回）的完整工作流
- 管理员端：方案发布和下架功能
- 公共展示：已发布方案的详情页展示

**重要背景**：由于当前系统中 Solution 和 Product 数据为空，且前端也未实现相关功能，本次实施采用**全新设计**，避免迁移、合并带来的技术风险。在既有用户架构（User, CreatorProfile）的基础上进行重构，直接使用规范的数据模型。

这将完善平台的核心业务流程，使创作者能够提交方案、审核者能够审核、管理员能够发布，形成完整的方案生命周期管理。

## What Changes
- **ADDED**: 完整的方案提交流程（CREATOR 角色）
  - 创建草稿、编辑草稿、提交审核
  - 多步骤表单（基本信息、技术规格、BOM、资产上传）
  - 草稿自动保存功能
- **MODIFIED**: 方案审核工作流（REVIEWER/ADMIN 角色）
  - 完善现有审核 API（`/api/admin/solutions/[id]/review`）
  - 添加状态转换记录（fromStatus/toStatus）
  - 完善审核历史记录功能
- **ADDED**: 方案发布功能（ADMIN 角色）
  - 发布已审核通过的方案（`POST /api/solutions/:id/publish`）
  - 下架已发布的方案
- **ADDED**: Solution 数据模型（全新设计，无迁移负担）
  - ✅ 已添加基础字段（summary, tags, locale, technicalSpecs, useCases, architecture）
  - ✅ 已添加时间戳字段（lastReviewedAt, publishedAt, archivedAt）
  - ✅ 已确认 creatorId 字段存在（通过 CreatorProfile 关联）
  - **新增** SolutionAsset 和 SolutionBomItem 模型（直接使用关系型表，不保留 JSON 字段）
- **MODIFIED**: SolutionReview 模型
  - 添加 fromStatus/toStatus 字段以记录状态转换
  - 完善审核记录结构
- **ADDED**: 前端页面（全新实现）
  - `/[locale]/creator/solutions` - 创作者方案列表
  - `/[locale]/creator/solutions/new` - 新建方案（多步骤表单）
  - `/[locale]/creator/solutions/[id]/edit` - 编辑方案
  - **完善** `/[locale]/admin/solutions` - 审核列表（已存在，需增强）
  - **完善** `/[locale]/admin/solutions/[id]` - 审核详情页（已存在，需增强）
  - `/[locale]/solutions/[id]` - 公共方案详情页

## Impact
- **Affected specs**: `solution-submission`, `solution-review`, `solution-publishing`
- **Affected code**: 
  - Prisma schema (`prisma/schema.prisma`) - **全新设计，无历史包袱**
  - API routes (`src/app/api/solutions/*`) - **全新实现，统一响应格式**
  - Frontend pages (`src/app/[locale]/creator/*`, `src/app/[locale]/admin/*`, `src/app/[locale]/solutions/*`) - **全新实现**
  - Components (`src/components/creators/*`, `src/components/admin/*`) - **全新实现**
- **Breaking changes**: 
  - **无数据迁移风险**：由于数据为空，直接使用新模型，无需迁移
  - **API 响应格式统一**：所有 API 使用 createSuccessResponse/createErrorResponse
  - **移除 JSON 字段依赖**：不再使用 `bom Json?` 和 `specs Json?`，改用 SolutionBomItem 和 technicalSpecs
- **Dependencies**: 
  - Prisma ORM（数据库迁移）
  - Supabase Storage（文件上传）
  - React Hook Form + Zod（表单验证）
  - 现有认证系统（权限验证）


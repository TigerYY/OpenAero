# 方案提交审核发布全流程 - 设计文档

## Context
参考 `DOCS/development/solution-submission-flow-spec.md` 规范文档，需要实现完整的方案生命周期管理。当前系统已有基础的 Solution 模型和部分 API，但缺少：
- 完整的方案提交流程
- 规范的审核工作流
- 发布和下架功能
- 前端页面实现

## Goals / Non-Goals

### Goals
- 实现完整的方案提交、审核、发布状态机
- 提供创作者友好的方案创建和编辑界面
- 提供审核者高效的审核工作流
- 确保权限控制和状态转换的正确性
- 支持方案资产（图片、文档、视频、CAD）管理
- 支持 BOM 清单管理和商城 SKU 关联

### Non-Goals
- 方案评论系统（v2 功能）
- 方案 Fork/Remix 功能（v3 功能）
- AI 自动生成摘要/标签（v4 功能）
- 方案销售和支付功能（方案本身不可直接下单）

## Decisions

### Decision: 数据模型扩展
**What**: 扩展 Solution 模型，添加 SolutionAsset 和 SolutionBomItem 独立模型
**Why**: 
- 规范文档要求独立的资产和 BOM 模型
- 便于管理和查询
- 支持 BOM 关联商城 Product

**Current State**:
当前系统使用 `bom Json?` 字段存储 BOM 数据，但由于数据为空且前端未实现，本次重构**直接使用关系型表**，不保留 JSON 字段。

**设计决策**：
- **移除** `bom Json?` 和 `specs Json?` 字段（数据为空，无需兼容）
- **新增** SolutionBomItem 模型：支持关联 Product，便于查询和索引
- **新增** SolutionAsset 模型：规范化资产管理
- **使用** technicalSpecs Json?：替代旧的 specs 字段

**Alternatives considered**:
- 保持 JSON 字段存储：不够灵活，难以查询和关联 Product
- **选择**：独立 SolutionBomItem 和 SolutionAsset 模型，更符合关系型数据库设计，支持外键关联，无迁移负担

### Decision: 状态机实现
**What**: 使用 SolutionStatus 枚举 + 后端验证实现状态机
**Why**: 
- 状态转换有严格的业务规则
- 需要权限验证和审计记录
- 枚举类型提供类型安全

**Alternatives considered**:
- 状态机库（如 XState）：过度设计，当前需求简单
- 选择：枚举 + 验证函数，简单直接

### Decision: 审核记录模型
**What**: SolutionReview 记录状态转换（fromStatus → toStatus）
**Why**: 
- 需要完整的审核历史
- 便于追踪状态变更
- 支持审核意见和评分

**Alternatives considered**:
- 仅记录最终状态：丢失历史信息
- 选择：记录状态转换，保留完整历史

### Decision: 文件上传流程
**What**: 前端先上传到 Supabase Storage，再调用 API 写入 metadata
**Why**: 
- 利用 Supabase Storage 的 CDN 和权限控制
- 避免服务器中转大文件
- 支持直接 URL 访问

**Alternatives considered**:
- 服务器中转上传：增加服务器负载
- 选择：客户端直传 Supabase Storage

### Decision: 多步骤表单
**What**: 使用 React Hook Form + Zod 实现多步骤表单
**Why**: 
- 表单复杂，需要分步填写
- 需要实时验证和草稿保存
- React Hook Form 性能好，Zod 类型安全

**Alternatives considered**:
- 单页表单：用户体验差
- 选择：多步骤表单，提升用户体验

## Risks / Trade-offs

### Risk: 状态转换错误
**Mitigation**: 
- 后端严格验证状态转换规则
- 使用事务确保状态一致性
- 记录所有状态变更到审核历史

### Risk: 权限控制漏洞
**Mitigation**: 
- 所有 API 路由进行权限检查
- 使用统一的权限验证函数
- 前端和后端双重验证

### Risk: 文件上传失败
**Mitigation**: 
- 实现重试机制
- 显示上传进度
- 支持断点续传（未来优化）

### Trade-off: 草稿自动保存频率
**Decision**: 使用防抖（debounce）每 2 秒保存一次
**Rationale**: 平衡用户体验和服务器负载

## Implementation Plan（重构版：无迁移负担）

### Phase 1: 数据库模型设计（全新实现）
1. **扩展 Solution 模型** ✅ **已完成**
   - ✅ 添加 summary, tags, locale, technicalSpecs, useCases, architecture 字段
   - ✅ 添加 lastReviewedAt, publishedAt, archivedAt 时间戳字段
   - ✅ 确认 creatorId 字段存在

2. **创建新模型**（直接使用关系型表）
   - 创建 SolutionAsset 模型（替代 JSON 存储）
   - 创建 SolutionBomItem 模型（替代 `bom Json?` 字段）
   - 更新 SolutionReview 模型（添加 fromStatus/toStatus）
   - **不保留** `bom Json?` 和 `specs Json?` 字段（数据为空，无需兼容）

3. **运行 Prisma 迁移**
   - `npx prisma migrate dev --name add_solution_submission_models`
   - 验证迁移成功
   - 更新 Prisma Client

### Phase 2: API 实现（全新实现）
1. **新建 API**
   - `POST /api/solutions` - 创建方案（使用新模型）
   - `PUT /api/solutions/:id` - 更新方案
   - `POST /api/solutions/:id/submit` - 提交审核
   - `POST /api/solutions/:id/publish` - 发布/下架
   - `PUT /api/solutions/:id/bom` - BOM 管理（使用 SolutionBomItem）
   - `POST /api/solutions/:id/assets` - 资产管理（使用 SolutionAsset）
   - `GET /api/solutions/mine` - 创作者方案列表
   - `GET /api/solutions/:id/review-history` - 审核历史

2. **修改现有 API**
   - `PUT /api/admin/solutions/[id]/review` - 添加 fromStatus/toStatus 记录
   - `GET /api/solutions` - 添加权限控制和状态过滤
   - `GET /api/solutions/:id` - 添加权限控制和完整信息返回（使用新模型）

### Phase 3: 前端实现（全新实现）
1. **新建页面**
   - `/[locale]/creator/solutions` - 创作者方案列表
   - `/[locale]/creator/solutions/new` - 新建方案（多步骤表单）
   - `/[locale]/creator/solutions/[id]/edit` - 编辑方案
   - `/[locale]/solutions/[id]` - 公共详情页

2. **完善现有页面**
   - `/[locale]/admin/solutions` - 增强审核列表功能
   - `/[locale]/admin/solutions/[id]` - 增强审核详情页

### Phase 4: 测试和优化
1. 端到端测试
2. 性能优化
3. 用户体验优化

## Open Questions
- [x] 是否需要支持方案版本管理？**答案**：当前已有 SolutionVersion 模型，本次不修改版本管理功能
- [x] 审核是否需要多级审核？**答案**：当前设计为单级审核（REVIEWER/ADMIN），符合规范文档要求
- [x] BOM 关联商城 Product 是否需要实时同步？**答案**：当前设计为手动关联，符合规范文档要求
- [x] Solution 模型是否需要 creatorId 字段？**答案**：通过 CreatorProfile 关联，但需要确认是否已有直接字段
- [x] 如何处理现有 JSON BOM 数据？**答案**：由于数据为空，直接移除 JSON 字段，使用 SolutionBomItem 表

## Implementation Notes

### 现有代码兼容性
- `POST /api/solutions/[id]/submit` 已存在，使用 `solutionService.submitForReview`
- `PUT /api/admin/solutions/[id]/review` 已存在，使用 `completeReview` 函数
- `GET /api/admin/solutions` 已存在，已实现分页和筛选
- Solution 模型可能通过 CreatorProfile 关联，需要确认 creatorId 字段状态

### 数据模型策略（重构版）
1. **全新设计**：直接使用 SolutionBomItem 和 SolutionAsset 表，不保留 JSON 字段
2. **无迁移负担**：由于数据为空，无需数据迁移脚本
3. **类型安全**：使用 Prisma 关系型模型，提供完整的类型支持
4. **查询优化**：支持索引和外键关联，提升查询性能

### 前端路径修正
- 使用 `[locale]` 路由前缀（`/[locale]/creator/...`）
- 与现有页面结构保持一致


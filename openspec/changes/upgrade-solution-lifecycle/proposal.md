# 升级解决方案全周期管理流程

## Why
当前解决方案流程从 `APPROVED` 直接发布到 `PUBLISHED`，缺少上架前的优化步骤，且下架后无法快速恢复。同时，创作者无法基于已有方案快速创建新方案。根据 `docs/solution-lifecycle-optimization-proposal.md` 和 `docs/solution-optimization-checklist.md`，需要：

1. **优化上架/下架流程**：增加 `READY_TO_PUBLISH` 和 `SUSPENDED` 状态，提供更可控的发布管理
2. **增强上架功能**：支持管理员在上架时进行内容优化（媒体链接、商品链接、SEO优化等）
3. **完善状态管理**：增加中间状态，提高流程可控性
4. **支持方案升级**：允许创作者基于已有方案快速创建新方案

这将提升平台的管理效率和用户体验，使方案发布流程更加专业和可控。

## What Changes
- **MODIFIED**: 方案发布流程（ADMIN 角色）
  - 新增 `READY_TO_PUBLISH` 状态（上架优化阶段）
  - 新增 `SUSPENDED` 状态（临时下架，可快速恢复）
  - 更新状态转换：`APPROVED` → `READY_TO_PUBLISH` → `PUBLISHED`
  - 支持 `PUBLISHED` → `SUSPENDED` → `PUBLISHED`（快速恢复）
  - 支持批量上架/下架操作
- **ADDED**: 上架优化功能（ADMIN 角色）
  - 上架说明 (`publish_description`)
  - 媒体链接管理 (`media_links`)
  - 商品链接关联 (`product_links`)
  - SEO 优化字段 (`meta_title`, `meta_description`, `meta_keywords`)
  - 推荐设置 (`featured_tags`, `is_featured`, `featured_order`)
  - 发布预览功能
- **ADDED**: SolutionPublishing 数据模型
  - 新建独立表存储管理员商品化数据（见 design.md）
  - 包含上架说明、媒体链接、商品链接、SEO优化等字段
- **MODIFIED**: Solution 数据模型
  - 新增升级相关字段（见 design.md）
  - 新增状态 `READY_TO_PUBLISH` 和 `SUSPENDED`
  - **移除**：不再在 Solution 表中添加上架优化字段（改为独立表）
- **ADDED**: 方案升级功能（CREATOR 角色）
  - 基于已有方案创建升级版本
  - 支持选择性升级（资产、BOM、文件）
  - 升级历史追踪
- **ADDED**: 前端页面
  - `/zh-CN/admin/solutions/[id]/optimize` - 上架优化页面
  - `/zh-CN/admin/solutions/publish-management` - 发布管理页面
  - 升级方案对话框组件

## Impact
- **Affected specs**: `solution-publishing`, `solution-review`, `solution-submission`, `solution-upgrade` (new)
- **Affected code**: 
  - Prisma schema (`prisma/schema.prisma`) - 新增 `SolutionPublishing` 表、新增字段和状态
  - API routes (`src/app/api/solutions/[id]/publish`, `src/app/api/admin/solutions/[id]/optimize`, `src/app/api/solutions/[id]/upgrade`)
  - Frontend pages (`src/app/[locale]/admin/solutions/*`, `src/app/[locale]/creators/solutions/*`)
  - Components (`src/components/admin/*`, `src/components/creators/*`)
- **Breaking changes**: 
  - **状态枚举扩展**：新增 `READY_TO_PUBLISH` 和 `SUSPENDED` 状态，需要数据库迁移
  - **发布流程变更**：不再支持直接从 `APPROVED` → `PUBLISHED`，必须先进入 `READY_TO_PUBLISH`
- **Dependencies**: 
  - 现有认证系统（权限验证）
  - 现有商品系统（商品链接关联）
  - Prisma ORM（数据库迁移）


# 解决方案全周期管理流程升级 - 设计文档

## Context
当前解决方案流程存在以下问题：
1. 上架流程过于简单：直接从 `APPROVED` → `PUBLISHED`，缺少上架前的优化步骤
2. 下架后状态不明确：`ARCHIVED` 状态后无法直接恢复，需要重新审核
3. 缺少上架前预览：管理员无法在上架前预览最终展示效果
4. 缺少批量操作：无法批量上架/下架方案
5. 创作者无法基于已有方案快速创建新方案

参考 `docs/solution-lifecycle-optimization-proposal.md` 和 `docs/solution-optimization-checklist.md` 进行优化。

## Goals / Non-Goals

### Goals
- 增加上架准备状态 `READY_TO_PUBLISH`，支持上架前优化
- 增加临时下架状态 `SUSPENDED`，支持快速恢复
- 支持管理员在上架时进行内容优化（媒体链接、商品链接、SEO等）
- 支持批量上架/下架操作
- 支持创作者基于已有方案创建升级版本
- 完善状态转换规则和权限控制

### Non-Goals
- 方案评论系统（已有其他规范）
- 方案 Fork/Remix 功能（v3 功能）
- AI 自动生成摘要/标签（v4 功能）
- 方案销售和支付功能（方案本身不可直接下单）

## Decisions

### Decision: 新增状态 `READY_TO_PUBLISH` 和 `SUSPENDED`
**What**: 在现有状态基础上新增两个状态
**Why**: 
- `READY_TO_PUBLISH`：提供上架前的优化阶段，管理员可以添加媒体链接、商品链接、SEO优化等
- `SUSPENDED`：提供临时下架功能，可以快速恢复，不需要重新审核

**状态流转**：
```
APPROVED → READY_TO_PUBLISH → PUBLISHED
PUBLISHED → SUSPENDED → PUBLISHED (快速恢复)
PUBLISHED → ARCHIVED (永久下架)
```

**Alternatives considered**:
- 保持现有流程：无法支持上架优化和快速恢复
- 选择：新增状态，提供更灵活的流程控制

### Decision: 上架优化数据存储设计
**What**: 创建独立的 `SolutionPublishing` 表存储管理员商品化数据
**Why**: 
- **职责分离**：创作者提交的内容（Solution 表）与管理员的商品化优化（SolutionPublishing 表）分离
- **历史追踪**：可以保留优化历史，支持查看管理员修改记录
- **灵活性**：支持多次优化，方案下架后重新上架时可以重新优化
- **数据完整性**：不影响 Solution 表结构，保持创作者原始数据不变

**数据模型设计**：
```prisma
model SolutionPublishing {
  id                String   @id @default(cuid())
  solution_id       String   @unique @map("solution_id")
  
  // 商品化内容
  publish_description String?   @map("publish_description")  // 上架说明
  media_links        Json?     @map("media_links")          // 媒体链接数组
  product_links      Json?     @map("product_links")        // 商品链接数组
  
  // SEO 优化
  meta_title         String?   @map("meta_title")
  meta_description   String?   @map("meta_description")
  meta_keywords      String[]  @map("meta_keywords")
  
  // 推荐设置
  featured_tags      String[]  @map("featured_tags")
  featured_order     Int?      @map("featured_order")
  is_featured        Boolean   @default(false) @map("is_featured")
  
  // 统计信息（发布后更新）
  view_count         Int       @default(0) @map("view_count")
  download_count     Int       @default(0) @map("download_count")
  like_count         Int       @default(0) @map("like_count")
  
  // 优化记录
  optimized_at       DateTime? @map("optimized_at")
  optimized_by       String?   @map("optimized_by")
  optimization_notes String?   @map("optimization_notes")    // 优化说明
  
  created_at         DateTime  @default(now()) @map("created_at")
  updated_at         DateTime  @updatedAt @map("updated_at")
  
  solution Solution @relation(fields: [solution_id], references: [id], onDelete: Cascade)
  
  @@map("solution_publishing")
}
```

**查询方式**：
- 公共展示：`Solution` JOIN `SolutionPublishing`（如果存在）
- 如果 `SolutionPublishing` 不存在，使用 `Solution` 的默认值
- 管理员优化时创建或更新 `SolutionPublishing` 记录

**Alternatives considered**:
- **在 Solution 表中添加字段**：
  - 优点：查询简单，不需要 JOIN
  - 缺点：混合创作者内容和管理员优化，无法保留历史，职责不清
- **选择：独立表**：
  - 优点：职责分离，支持历史追踪，灵活性高
  - 缺点：需要 JOIN 查询（但可以通过 include 优化）

### Decision: 上架优化历史追踪（可选）
**What**: 可选地创建 `SolutionPublishingHistory` 表记录优化历史
**Why**: 
- 如果需要追踪管理员对商品化内容的修改历史
- 支持回滚到之前的优化版本
- 审计和合规需求

**设计**（可选，v2 功能）：
```prisma
model SolutionPublishingHistory {
  id                String   @id @default(cuid())
  solution_id       String   @map("solution_id")
  version           Int      // 优化版本号
  
  // 优化内容快照（与 SolutionPublishing 相同结构）
  publish_description String?
  media_links        Json?
  product_links      Json?
  // ... 其他字段
  
  optimized_at       DateTime
  optimized_by       String
  optimization_notes String?
  
  created_at         DateTime @default(now())
  
  solution Solution @relation(fields: [solution_id], references: [id], onDelete: Cascade)
  
  @@unique([solution_id, version])
  @@map("solution_publishing_history")
}
```

**当前决策**：暂不实现历史追踪，如果未来需要可以添加。

### Decision: 方案升级功能设计
**What**: 支持创作者基于已有方案创建升级版本
**Why**: 
- 创作者经常需要基于已有方案创建新版本
- 可以复用大部分内容，提高效率

**字段设计**：
```prisma
upgraded_from_id       String?   // 源方案ID
upgraded_from_version  Int?      // 源方案版本
upgrade_notes          String?   // 升级说明
is_upgrade             Boolean   // 是否为升级方案
```

**Alternatives considered**:
- 使用版本系统：增加复杂度，当前不需要
- 选择：简单的升级关系，满足当前需求

### Decision: 批量操作实现
**What**: 支持批量上架/下架/恢复操作
**Why**: 
- 管理员需要同时处理多个方案
- 提高操作效率

**实现方式**：
- 使用事务确保原子性
- 限制批量数量（建议最多 10 个）
- 提供进度反馈

**Alternatives considered**:
- 队列处理：增加复杂度，当前不需要
- 选择：同步处理，简单直接

## Risks / Trade-offs

### Risk: 状态转换错误
**Mitigation**: 
- 后端严格验证状态转换规则
- 使用事务确保状态一致性
- 记录所有状态变更到审核历史

### Risk: 数据迁移风险
**Mitigation**: 
- 创建回滚脚本
- 分批次迁移
- 在开发环境充分测试

### Risk: 批量操作性能
**Mitigation**: 
- 限制批量数量
- 使用事务但设置超时
- 提供进度反馈

### Risk: 升级功能滥用
**Mitigation**: 
- 限制升级频率（如每天最多 5 次）
- 要求提供升级说明
- 监控升级行为

## Migration Plan

### 数据库迁移
1. 添加新状态到 `SolutionStatus` 枚举
2. 添加上架优化字段到 `Solution` 表
3. 添加升级相关字段到 `Solution` 表
4. 迁移现有 `APPROVED` 状态的方案（可选，保持现状或迁移到 `READY_TO_PUBLISH`）

### 代码迁移
1. 更新状态转换逻辑
2. 更新 API 端点
3. 更新前端页面
4. 更新权限验证

### 回滚计划
1. 准备数据库回滚脚本
2. 准备代码回滚版本
3. 测试回滚流程

## Open Questions
- 现有 `APPROVED` 状态的方案是否需要迁移到 `READY_TO_PUBLISH`？
  - 建议：保持现状，新流程仅适用于新审核通过的方案
- 批量操作的最大数量限制？
  - 建议：10 个方案
- 升级功能的频率限制？
  - 建议：每个创作者每天最多 5 次


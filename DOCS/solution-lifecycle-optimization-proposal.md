# 解决方案全周期管理流程优化建议

**版本**: 1.0.0  
**创建日期**: 2025-01-31  
**状态**: 待实施

---

## 目录

1. [概述](#概述)
2. [上架/下架流程优化](#上架下架流程优化)
3. [上架优化功能](#上架优化功能)
4. [状态管理完善](#状态管理完善)
5. [方案升级功能](#方案升级功能)
6. [实施计划](#实施计划)

---

## 概述

本文档基于当前实现和 `solution-complete-lifecycle.md`，提出对"解决方案"全周期管理流程的优化建议，旨在：

1. **优化上架/下架流程**：提供更清晰、可控的发布管理
2. **增强上架功能**：支持管理员在上架时进行内容优化和关联
3. **完善状态管理**：增加中间状态，提高流程可控性
4. **支持方案升级**：允许创作者基于已有方案快速创建新方案

---

## 上架/下架流程优化

### 当前问题

1. **上架流程过于简单**：直接从 `APPROVED` → `PUBLISHED`，缺少上架前的优化步骤
2. **下架后状态不明确**：`ARCHIVED` 状态后无法直接恢复，需要重新审核
3. **缺少上架前预览**：管理员无法在上架前预览最终展示效果
4. **缺少批量操作**：无法批量上架/下架方案

### 优化方案

#### 1. 增加上架准备状态 `READY_TO_PUBLISH`

**新增状态**：
```typescript
enum SolutionStatus {
  DRAFT
  PENDING_REVIEW
  APPROVED
  READY_TO_PUBLISH  // 新增：已优化，准备发布
  PUBLISHED
  REJECTED
  ARCHIVED
  SUSPENDED          // 新增：临时下架（可快速恢复）
}
```

**状态流转**：
```
APPROVED → READY_TO_PUBLISH → PUBLISHED
PUBLISHED → SUSPENDED → PUBLISHED (快速恢复)
PUBLISHED → ARCHIVED (永久下架)
```

#### 2. 上架流程优化

**新流程**：
1. **审核通过** (`APPROVED`)
   - 管理员审核通过后，方案进入 `APPROVED` 状态
   - 此时方案还不能直接发布

2. **上架优化** (`APPROVED` → `READY_TO_PUBLISH`)
   - 管理员进入"上架优化"页面
   - 可以添加/修改：
     - 上架说明（`publish_description`）
     - 媒体链接（`media_links`）
     - 商品链接（`product_links`）
     - SEO 优化（`meta_title`, `meta_description`, `meta_keywords`）
     - 推荐标签（`featured_tags`）
   - 预览最终展示效果
   - 确认后状态变为 `READY_TO_PUBLISH`

3. **发布上线** (`READY_TO_PUBLISH` → `PUBLISHED`)
   - 管理员确认发布
   - 方案正式上线，状态变为 `PUBLISHED`
   - 记录发布时间 `published_at`

#### 3. 下架流程优化

**两种下架方式**：

**A. 临时下架（SUSPENDED）**
- 适用于：需要临时隐藏但可能恢复的方案
- 状态：`PUBLISHED` → `SUSPENDED`
- 特点：
  - 可以快速恢复为 `PUBLISHED`
  - 保留所有上架优化内容
  - 不改变 `published_at` 时间
- 恢复：`SUSPENDED` → `PUBLISHED`（一键恢复）

**B. 永久下架（ARCHIVED）**
- 适用于：不再需要的方案
- 状态：`PUBLISHED` → `ARCHIVED`
- 特点：
  - 需要重新审核才能恢复
  - 保留历史记录
  - 记录下架时间 `archived_at`
- 恢复：`ARCHIVED` → `DRAFT` → 重新提交审核

#### 4. 批量操作支持

**功能**：
- 批量上架：选择多个 `READY_TO_PUBLISH` 状态的方案，批量发布
- 批量下架：选择多个 `PUBLISHED` 状态的方案，批量下架
- 批量恢复：选择多个 `SUSPENDED` 状态的方案，批量恢复

---

## 上架优化功能

### 数据模型扩展

#### 1. Solution 模型新增字段

```prisma
model Solution {
  // ... 现有字段 ...

  // 上架优化相关字段
  publish_description    String?   @map("publish_description")  // 上架说明
  media_links           Json?     @map("media_links")            // 媒体链接（视频、演示等）
  product_links         Json?     @map("product_links")          // 商品链接（关联商城商品）
  meta_title            String?   @map("meta_title")             // SEO 标题
  meta_description      String?   @map("meta_description")      // SEO 描述
  meta_keywords         String[]  @map("meta_keywords")         // SEO 关键词
  featured_tags         String[]  @map("featured_tags")          // 推荐标签
  featured_order        Int?      @map("featured_order")         // 推荐排序（数字越小越靠前）
  is_featured           Boolean   @default(false) @map("is_featured")  // 是否推荐
  view_count            Int       @default(0) @map("view_count")       // 浏览次数
  download_count        Int       @default(0) @map("download_count")   // 下载次数
  like_count            Int       @default(0) @map("like_count")       // 点赞数
  
  // 上架优化时间戳
  optimized_at          DateTime? @map("optimized_at")            // 优化完成时间
  optimized_by          String?   @map("optimized_by")            // 优化人员ID
}
```

#### 2. 媒体链接结构

```typescript
interface MediaLink {
  type: 'VIDEO' | 'DEMO' | 'TUTORIAL' | 'DOCUMENTATION' | 'OTHER';
  title: string;
  url: string;
  thumbnail?: string;
  description?: string;
  duration?: number; // 视频时长（秒）
}
```

#### 3. 商品链接结构

```typescript
interface ProductLink {
  productId: string;      // 关联的商品ID
  productName: string;     // 商品名称（冗余，便于显示）
  productSku: string;      // 商品SKU
  productUrl: string;      // 商品详情页URL
  relationType: 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL'; // 关联类型
  description?: string;   // 关联说明
}
```

### API 端点

#### 1. 上架优化 API

**PUT `/api/admin/solutions/[id]/optimize`**

**功能**：管理员对方案进行上架优化

**请求体**：
```typescript
{
  publishDescription?: string;
  mediaLinks?: MediaLink[];
  productLinks?: ProductLink[];
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  featuredTags?: string[];
  featuredOrder?: number;
  isFeatured?: boolean;
}
```

**响应**：
```typescript
{
  success: true;
  data: {
    id: string;
    status: 'READY_TO_PUBLISH';
    optimizedAt: string;
  };
  message: '方案优化完成，已准备发布';
}
```

#### 2. 预览发布效果 API

**GET `/api/admin/solutions/[id]/preview`**

**功能**：预览方案发布后的展示效果

**响应**：返回完整的方案信息，包括所有优化内容

#### 3. 批量发布 API

**POST `/api/admin/solutions/batch-publish`**

**请求体**：
```typescript
{
  solutionIds: string[];
}
```

**功能**：批量发布多个 `READY_TO_PUBLISH` 状态的方案

### 前端页面

#### 1. 上架优化页面

**路径**：`/zh-CN/admin/solutions/[id]/optimize`

**功能**：
- 显示方案基本信息（只读）
- 编辑上架说明
- 添加/编辑媒体链接
- 关联商品链接（支持搜索商品）
- SEO 优化设置
- 推荐设置
- 实时预览发布效果
- 保存优化（状态变为 `READY_TO_PUBLISH`）
- 直接发布（跳过预览，直接发布）

#### 2. 发布管理页面

**路径**：`/zh-CN/admin/solutions/publish-management`

**功能**：
- 列表显示所有 `READY_TO_PUBLISH` 状态的方案
- 支持批量选择
- 批量发布按钮
- 单个方案的操作：
  - 预览
  - 优化
  - 发布
  - 取消（退回 `APPROVED`）

---

## 状态管理完善

### 新增状态

#### 1. `READY_TO_PUBLISH` - 准备发布

**定义**：方案已通过审核并完成上架优化，等待发布

**特点**：
- 由 `APPROVED` 状态转换而来
- 可以预览最终展示效果
- 可以快速发布为 `PUBLISHED`
- 可以退回为 `APPROVED`（重新优化）

**权限**：
- ADMIN：可以优化、发布、退回
- CREATOR：可以查看，但不能操作

#### 2. `SUSPENDED` - 临时下架

**定义**：方案临时下架，但保留上架优化内容，可快速恢复

**特点**：
- 由 `PUBLISHED` 状态转换而来
- 不改变 `published_at` 时间
- 可以一键恢复为 `PUBLISHED`
- 不会出现在公共列表中

**权限**：
- ADMIN：可以下架、恢复
- CREATOR：可以查看，但不能操作

### 状态转换规则

#### 完整状态流转图

```
                    ┌─────────┐
                    │  DRAFT  │ 草稿
                    └────┬────┘
                         │
                    ┌────▼──────────────────────────┐
                    │  提交审核                      │
                    └────┬──────────────────────────┘
                         │
                    ┌────▼──────────────┐
                    │ PENDING_REVIEW    │ 待审核
                    └────┬──────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────▼────┐    ┌─────▼─────┐    ┌────▼────┐
   │ APPROVED│    │ REJECTED  │    │NEEDS_   │ 需修改
   │ 已批准  │    │ 已拒绝    │    │REVISION │
   └────┬────┘    └─────┬─────┘    └────┬────┘
        │               │                │
        │               │                │
   ┌────▼───────────────┐    ┌─────▼─────┐    ┌────▼────┐
   │ READY_TO_PUBLISH   │    │  DRAFT     │    │PENDING_ │
   │ 准备发布           │    │ (重新编辑) │    │REVIEW   │
   └────┬───────────────┘    └─────┬─────┘    └─────────┘
        │                          │
        │                          │
   ┌────▼───────────────┐    ┌─────▼─────┐
   │ PUBLISHED          │    │ 重新提交   │
   │ 已发布             │    │ 审核       │
   └────┬───────────────┘    └─────────────┘
        │
        │
   ┌────┴───────────────┐
   │                    │
   │                    │
┌──▼────┐        ┌─────▼─────┐
│SUSPENDED│        │ ARCHIVED │
│临时下架│        │ 永久下架  │
└──┬────┘        └───────────┘
   │
   │ (快速恢复)
   │
┌──▼────┐
│PUBLISHED│
└────────┘
```

### 状态转换权限表

| 当前状态 | 目标状态 | 操作者 | 说明 |
|---------|---------|--------|------|
| `APPROVED` | `READY_TO_PUBLISH` | ADMIN | 上架优化 |
| `READY_TO_PUBLISH` | `PUBLISHED` | ADMIN | 发布上线 |
| `READY_TO_PUBLISH` | `APPROVED` | ADMIN | 退回重新优化 |
| `PUBLISHED` | `SUSPENDED` | ADMIN | 临时下架 |
| `SUSPENDED` | `PUBLISHED` | ADMIN | 恢复上线 |
| `PUBLISHED` | `ARCHIVED` | ADMIN | 永久下架 |
| `ARCHIVED` | `DRAFT` | ADMIN | 恢复为草稿（需重新审核） |

### 状态查询优化

#### 1. 审核工作台增加"准备发布"标签页

**功能**：
- 显示所有 `READY_TO_PUBLISH` 状态的方案
- 支持批量发布
- 显示优化完成时间

#### 2. 方案管理页面增加状态筛选

**筛选选项**：
- 全部
- 待审核 (`PENDING_REVIEW`)
- 已批准 (`APPROVED`)
- 准备发布 (`READY_TO_PUBLISH`)
- 已发布 (`PUBLISHED`)
- 临时下架 (`SUSPENDED`)
- 已归档 (`ARCHIVED`)

---

## 方案升级功能

### 功能概述

允许创作者基于已有方案（自己的或公开的）快速创建新方案，支持：
- 升级方案基本信息
- 升级技术规格、应用场景、架构描述
- 升级 BOM 清单
- 升级资产文件（可选）
- 自动生成新标题（添加"升级版"或版本号）

### 数据模型

#### 1. Solution 模型新增字段

```prisma
model Solution {
  // ... 现有字段 ...

  // 升级相关字段
  upgraded_from_id       String?   @map("upgraded_from_id")        // 源方案ID
  upgraded_from_version  Int?      @map("upgraded_from_version")    // 源方案版本
  upgrade_notes          String?   @map("upgrade_notes")           // 升级说明
  is_upgrade             Boolean   @default(false) @map("is_upgrade")  // 是否为升级方案
}
```

### API 端点

#### 1. 升级方案 API

**POST `/api/solutions/[id]/upgrade`**

**功能**：基于指定方案创建升级版本

**权限**：
- CREATOR：可以升级自己的方案和已发布的方案
- ADMIN：可以升级任何方案

**请求体**：
```typescript
{
  title?: string;              // 新方案标题（可选，默认：原标题 + " - 升级版"）
  upgradeAssets?: boolean;       // 是否升级资产文件（默认：false）
  upgradeBom?: boolean;           // 是否升级BOM清单（默认：true）
  upgradeFiles?: boolean;         // 是否升级文件（默认：false）
  upgradeNotes?: string;          // 升级说明
}
```

**响应**：
```typescript
{
  success: true;
  data: {
    id: string;                // 新方案ID
    title: string;
    status: 'DRAFT';
    upgradedFromId: string;
    upgradedFromVersion: number;
  };
  message: '方案升级成功';
}
```

**实现逻辑**：
```typescript
async function upgradeSolution(
  sourceSolutionId: string,
  creatorId: string,
  options: UpgradeOptions
) {
  // 1. 获取源方案
  const sourceSolution = await prisma.solution.findUnique({
    where: { id: sourceSolutionId },
    include: {
      files: options.upgradeFiles,
      // ... 其他关联
    }
  });

  // 2. 验证权限
  if (sourceSolution.status !== 'PUBLISHED' && 
      sourceSolution.creator_id !== creatorId) {
    throw new Error('无权升级此方案');
  }

  // 3. 创建新方案
  const newSolution = await prisma.$transaction(async (tx) => {
    // 创建方案基本信息
    const upgraded = await tx.solution.create({
      data: {
        title: options.title || `${sourceSolution.title} - 升级版`,
        description: sourceSolution.description,
        category: sourceSolution.category,
        price: sourceSolution.price,
        status: 'DRAFT',
        creator_id: creatorId,
        specs: sourceSolution.specs,
        bom: options.upgradeBom ? sourceSolution.bom : null,
        features: sourceSolution.features,
        tags: sourceSolution.tags,
        images: sourceSolution.images,
        upgraded_from_id: sourceSolutionId,
        upgraded_from_version: sourceSolution.version,
        upgrade_notes: options.upgradeNotes,
        is_upgrade: true,
      }
    });

    // 升级资产文件（如果需要）
    if (options.upgradeAssets && sourceSolution.files) {
      await tx.solutionFile.createMany({
        data: sourceSolution.files.map(file => ({
          solution_id: upgraded.id,
          filename: file.filename,
          original_name: file.original_name,
          file_type: file.file_type,
          mime_type: file.mime_type,
          size: file.size,
          path: file.path,
          url: file.url,
          thumbnail_url: file.thumbnail_url,
          checksum: file.checksum,
          metadata: file.metadata,
          description: file.description,
          uploaded_by: creatorId,
        }))
      });
    }

    // 升级 BOM 项（如果需要）
    if (options.upgradeBom) {
      const bomItems = await tx.solutionBomItem.findMany({
        where: { solution_id: sourceSolutionId }
      });
      
      if (bomItems.length > 0) {
        await tx.solutionBomItem.createMany({
          data: bomItems.map(item => ({
            solution_id: upgraded.id,
            name: item.name,
            model: item.model,
            quantity: item.quantity,
            unit: item.unit,
            notes: item.notes,
            // ... 其他字段
          }))
        });
      }
    }

    return upgraded;
  });

  return newSolution;
}
```

### 前端页面

#### 1. 方案列表增加"升级"按钮

**位置**：
- 创作者方案列表：自己的方案和已发布的方案
- 公共方案列表：已发布的方案

**功能**：
- 点击"升级"按钮，弹出升级对话框
- 设置新方案标题
- 选择升级选项（资产、BOM、文件）
- 添加升级说明
- 确认后创建新方案，跳转到编辑页面

#### 2. 方案详情页增加"升级"按钮

**位置**：方案详情页右上角

**功能**：同上

### 升级历史追踪

#### 1. 显示升级关系

**方案详情页**：
- 如果方案是升级的，显示"基于 [源方案名称] 升级"
- 如果方案被升级，显示"已被升级 X 次"

#### 2. 升级树视图

**功能**：显示方案的升级关系树
```
源方案 v1.0
  ├─ 升级方案 A v1.0
  │   └─ 升级方案 A-1 v1.0
  └─ 升级方案 B v1.0
```

---

## 实施计划

### 阶段 1：数据模型和 API（2-3 周）

1. **数据库迁移**
   - 添加新状态 `READY_TO_PUBLISH`, `SUSPENDED`
   - 添加上架优化字段
   - 添加升级相关字段
   - 创建迁移脚本

2. **API 开发**
   - 上架优化 API (`PUT /api/admin/solutions/[id]/optimize`)
   - 预览发布效果 API (`GET /api/admin/solutions/[id]/preview`)
   - 批量发布 API (`POST /api/admin/solutions/batch-publish`)
   - 升级方案 API (`POST /api/solutions/[id]/upgrade`)
   - 状态转换 API 更新

3. **业务逻辑**
   - 状态转换规则实现
   - 权限验证
   - 数据验证

### 阶段 2：前端页面（2-3 周）

1. **上架优化页面**
   - 创建优化页面组件
   - 媒体链接管理
   - 商品链接关联
   - SEO 设置
   - 预览功能

2. **发布管理页面**
   - 列表展示
   - 批量操作
   - 状态筛选

3. **升级功能**
   - 升级对话框
   - 升级选项设置
   - 升级历史显示

4. **状态管理更新**
   - 审核工作台增加新标签页
   - 状态筛选更新
   - 状态转换按钮

### 阶段 3：测试和优化（1-2 周）

1. **功能测试**
   - 单元测试
   - 集成测试
   - E2E 测试

2. **性能优化**
   - 批量操作性能
   - 升级性能优化

3. **用户体验优化**
   - 界面优化
   - 交互优化
   - 错误处理

### 阶段 4：文档和培训（1 周）

1. **文档更新**
   - 更新 `solution-complete-lifecycle.md`
   - API 文档
   - 用户手册

2. **培训**
   - 管理员培训
   - 创作者培训

---

## 风险评估

### 技术风险

1. **数据迁移风险**
   - 风险：现有数据需要迁移到新状态
   - 缓解：创建回滚脚本，分批次迁移

2. **性能风险**
   - 风险：批量操作可能影响性能
   - 缓解：使用队列处理批量操作，限制批量数量

### 业务风险

1. **状态混乱**
   - 风险：新状态可能导致用户困惑
   - 缓解：提供清晰的状态说明和流程图

2. **升级滥用**
   - 风险：用户可能大量升级方案
   - 缓解：限制升级频率，添加升级说明要求

---

## 成功指标

1. **上架效率**
   - 上架时间从平均 30 分钟降低到 10 分钟
   - 批量上架支持 10+ 方案同时发布

2. **升级使用率**
   - 30% 的新方案通过升级创建
   - 升级方案的平均编辑时间减少 50%

3. **状态管理**
   - 状态转换错误率 < 1%
   - 状态查询响应时间 < 500ms

---

## 后续优化方向

1. **智能推荐**
   - 基于方案内容自动推荐商品
   - 自动生成 SEO 关键词

2. **版本管理增强**
   - 支持方案版本回滚
   - 版本对比功能

3. **数据分析**
   - 上架效果分析
   - 升级方案成功率分析

---

**最后更新**: 2025-01-31  
**维护者**: OpenAero 开发团队


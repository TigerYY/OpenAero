
⸻

solution-submission-flow-spec.md

# OpenAero 创作者方案提交（Solution Submission）  
# 提交 → 审核 → 发布 全流程实现规范  
**版本：1.0.0**  
**最后更新：2025-11-14**  
**适用系统：OpenAero Web 平台（Next.js 14 + Prisma + Supabase Auth + PostgreSQL）**  

---

# 0. 文档目的

本规范用于指导 AI Coding 工具（Cursor / Trae / CodeBuddy）或开发人员在现有 OpenAero 代码库中实现完整的：

- 创作者提交方案（Solution）
- 审核者审核流程
- 管理员发布与下架
- 方案详情展示（公共页）
- 与商城 SKU 的可选关联（非销售功能）

该文档提供 **数据模型 → API → 权限规则 → 页面结构 → 状态机** 全流程说明，可直接作为开发依据。

---

# 1. 角色与权限（Roles & Permissions）

系统角色（来自用户系统）：

| 角色 | 权限 |
|------|------|
| USER | 可查看已发布方案 |
| CREATOR | 可创建/编辑方案，可提交审核 |
| REVIEWER | 可审核方案（通过/驳回） |
| ADMIN | 可发布/下架方案 |
| SUPER_ADMIN | 拥有所有权限 |

权限规则总结：

- **仅 CREATOR** 可以创建方案、编辑草稿、重新提交。
- **REVIEWER + ADMIN** 可以审核。
- **仅 ADMIN** 可将方案设为 `PUBLISHED`。
- **USER** 仅能访问已发布的方案。

---

# 2. 状态机（Solution Status Lifecycle）

```mermaid
stateDiagram

[*] --> DRAFT

DRAFT --> PENDING_REVIEW: 提交审核
PENDING_REVIEW --> APPROVED: 审核通过
PENDING_REVIEW --> REJECTED: 审核驳回
APPROVED --> PUBLISHED: 管理员发布
PUBLISHED --> ARCHIVED: 管理员下架

REJECTED --> PENDING_REVIEW: 创作者修改后重新提交

状态说明：

状态	描述
DRAFT	创作者草稿，未提交
PENDING_REVIEW	待审核（创作者不可编辑）
APPROVED	审核者已通过审核，但未发布
REJECTED	审核未通过，创作者可修改
PUBLISHED	已发布，对外展示
ARCHIVED	已下架，不对外展示


⸻

3. 数据模型（Prisma Schema）

在 prisma/schema.prisma 添加：

enum SolutionStatus {
  DRAFT
  PENDING_REVIEW
  APPROVED
  REJECTED
  PUBLISHED
  ARCHIVED
}

enum AssetType {
  IMAGE
  DOCUMENT
  VIDEO
  CAD
  OTHER
}

model Solution {
  id              String           @id @default(cuid())
  creatorId       String
  creator         User             @relation(fields: [creatorId], references: [id])

  title           String
  summary         String           @db.Text
  description     String           @db.Text
  category        String
  tags            String[]         @db.Text

  version         String           @default("v1.0.0")
  status          SolutionStatus   @default(DRAFT)
  locale          String           @default("zh-CN")

  technicalSpecs  Json?
  useCases        Json?
  architecture    Json?

  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  lastReviewedAt  DateTime?
  publishedAt     DateTime?
  archivedAt      DateTime?

  reviewCount     Int              @default(0)

  assets          SolutionAsset[]
  bomItems        SolutionBomItem[]
  reviews         SolutionReview[]
}

model SolutionAsset {
  id          String   @id @default(cuid())
  solutionId  String
  solution    Solution @relation(fields: [solutionId], references: [id])

  type        AssetType
  url         String
  title       String?
  description String?

  createdAt   DateTime @default(now())
}

model SolutionBomItem {
  id          String   @id @default(cuid())
  solutionId  String
  solution    Solution @relation(fields: [solutionId], references: [id])

  name        String
  model       String?
  quantity    Int      @default(1)
  notes       String?

  productId   String?  // 可关联商城 SKU

  createdAt   DateTime @default(now())
}

model SolutionReview {
  id          String          @id @default(cuid())
  solutionId  String
  solution    Solution        @relation(fields: [solutionId], references: [id])

  reviewerId  String
  reviewer    User            @relation("SolutionReviewer", fields: [reviewerId], references: [id])

  fromStatus  SolutionStatus
  toStatus    SolutionStatus
  comment     String          @db.Text

  createdAt   DateTime        @default(now())
}


⸻

4. API & Server Actions 规范

API 路由前缀统一为：

/api/solutions/*

4.1 创建草稿（CREATOR）

POST /api/solutions

用途：新建空方案草稿。

校验：
	•	必须为角色 CREATOR

⸻

4.2 更新草稿内容

PUT /api/solutions/:id

可更新字段：
	•	title / summary / description
	•	tags / category
	•	technicalSpecs / useCases / architecture

允许状态：
	•	DRAFT
	•	REJECTED

⸻

4.3 更新 BOM

PUT /api/solutions/:id/bom

逻辑：
	•	删除当前 BOM
	•	批量创建新 BOM

⸻

4.4 上传资产记录

POST /api/solutions/:id/assets

前端先上传文件至 Supabase Storage → 再调用此 API 写入 metadata。

⸻

4.5 提交审核

POST /api/solutions/:id/submit

校验：
	•	当前用户为 creatorId
	•	当前状态 ∈ {DRAFT, REJECTED}
	•	必填字段完整（后端复核）
	•	至少 1 个 Asset（图/文档）
	•	状态切换 → PENDING_REVIEW
	•	创建审核记录（SolutionReview）

⸻

4.6 审核（REVIEWER / ADMIN）

POST /api/solutions/:id/review

Body：

{
  "action": "APPROVE" | "REJECT",
  "comment": "审核意见"
}

结果：
	•	APPROVE → APPROVED
	•	REJECT → REJECTED

⸻

4.7 发布 / 下架（ADMIN）

POST /api/solutions/:id/publish

{ "action": "PUBLISH" | "ARCHIVE" }

规则：
	•	APPROVED → PUBLISHED
	•	PUBLISHED → ARCHIVED

⸻

4.8 查询方法

用途	Endpoint
公共已发布列表	GET /api/solutions?status=PUBLISHED
创作者列表	GET /api/solutions/mine
审核列表（后台）	GET /api/solutions/admin
详情页	GET /api/solutions/:id


⸻

5. 前端页面规范（Next.js App Router）

5.1 创作者端

路径结构：

/creator/solutions
/creator/solutions/new
/creator/solutions/[id]/edit

页面说明：

✔ 我的方案列表

展示：
	•	标题
	•	状态
	•	更新时间
	•	操作（编辑、提交审核、查看审核记录）

⸻

✔ 新建方案 / 编辑方案（多步骤表单）

建议表单步骤：
	1.	基本信息
	2.	技术规格
	3.	应用场景 & 架构描述
	4.	BOM 编辑
	5.	资产上传
	6.	校验 & 提交审核

技术要求：
	•	React Hook Form + Zod
	•	可保存草稿（实时自动保存）
	•	上传文件用 Supabase Storage

⸻

5.2 后台审核端

路径结构：

/admin/solutions
/admin/solutions/[id]

页面功能：

审核列表
	•	状态筛选：PENDING_REVIEW / APPROVED / REJECTED
	•	按类别筛选
	•	按创作者搜索

审核详情页

包含：
	•	所有基础信息
	•	技术规格 JSON 格式化展示
	•	流程图 / 架构图预览
	•	BOM 表格
	•	资产预览（图片 + PDF + CAD 文件）
	•	审核历史（SolutionReview）

右侧操作区：
	•	审核通过
	•	审核驳回（必填备注）

⸻

5.3 公共详情页（PUBLISHED）

路径：

/solutions/[id]

内容：
	•	标题、摘要、标签
	•	方案结构图
	•	技术规格
	•	应用场景
	•	BOM（带 productId 则提供跳转至商城 SKU）
	•	资产浏览
	•	版本号与发布时间

⸻

6. 权限检查（后端）

必须在所有 API 内部执行状态 & 身份检查：

示例函数（伪代码）

function assertCreator(solution, user) {
  if (solution.creatorId !== user.id) throw new Error("Not allowed");
}

function assertReviewer(user) {
  if (!["REVIEWER", "ADMIN", "SUPER_ADMIN"].includes(user.role))
    throw new Error("Not reviewer");
}

function assertAdmin(user) {
  if (!["ADMIN", "SUPER_ADMIN"].includes(user.role))
    throw new Error("Not admin");
}

流程动作前的状态验证

示例（提交审核）：

if (![DRAFT, REJECTED].includes(solution.status)) throw Error("Invalid state");

示例（审核）：

if (solution.status !== PENDING_REVIEW) throw Error("Not reviewable");

示例（发布）：

if (solution.status !== APPROVED) throw Error("Cannot publish");


⸻

7. 审计记录（审核历史）

审核操作统一写入：
	•	SolutionReview
	•	字段包含：
	•	reviewerId
	•	fromStatus
	•	toStatus
	•	comment
	•	createdAt

供：
	•	创作者查看原因
	•	后台分析审查流量、效率
	•	平台透明度要求

⸻

8. 与商城（Products Mall）的集成说明
	•	仅允许 SolutionBomItem 引用商城 Product.id
	•	方案本身 不可直接下单 / 不含支付逻辑
	•	方案详情页中物料仅做以下动作：
	•	显示物料清单
	•	提供“查看商品详情”跳转按钮
	•	避免出现：加入购物车/立即购买 等电商 CTA

⸻

9. 给 AI Coding 的执行 Checklist

可在 Cursor / Trae 中直接让 AI 按照本清单逐步完成实现。

✔ 步骤 1：新增 Prisma 模型

按文档添加 4 个模型 + 2 个枚举
→ npx prisma migrate dev

✔ 步骤 2：实现所有 API Route
	•	/api/solutions/* 全部 CRUD + 状态机接口
	•	加入权限验证

✔ 步骤 3：创作者端页面
	•	列表页
	•	新建多步骤表单
	•	编辑页（含草稿保存）

✔ 步骤 4：审核后台页面
	•	审核列表
	•	审核详情
	•	操作区（通过/驳回）

✔ 步骤 5：公共展示页
	•	/solutions/[id]

✔ 步骤 6：联调 Storage
	•	资产上传（图片/视频/PDF/CAD）

✔ 步骤 7：添加日志 / 审核记录

✔ 步骤 8：自测用例
	•	提交/驳回/再提交
	•	审核通过/发布
	•	权限验证
	•	公共展示检查

⸻

10. 版本计划（可写入 PRD）

阶段	说明
v1	完整提交/审核/发布链路
v2	评论系统（对方案留言）
v3	方案 Fork / Remix（创作者协作）
v4	AI 自动生成方案摘要/标签推荐


⸻

完成说明

本文件是 OpenAero 平台“解决方案提交系统”的完整开发规范，已涵盖：

✔ 数据库建模
✔ 状态机设计
✔ API 全覆盖
✔ 前端页面结构
✔ 审核端逻辑
✔ 权限验证
✔ 与商城系统兼容
✔ 可交付给 AI 进行端到端实现




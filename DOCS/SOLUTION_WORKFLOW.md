# 方案管理工作流程

**版本**: 1.0.0  
**最后更新**: 2025-01-16  
**状态**: ✅ 已发布  
**相关文档**: [API文档](./API_DOCUMENTATION.md) | [数据库架构](./DATABASE_SCHEMA.md) | [系统架构](./ARCHITECTURE.md)

---

## 📋 目录

1. [概述](#概述)
2. [方案状态流转](#方案状态流转)
3. [角色与权限](#角色与权限)
4. [工作流程详解](#工作流程详解)
5. [文件管理](#文件管理)
6. [版本控制](#版本控制)
7. [审核机制](#审核机制)
8. [通知系统](#通知系统)
9. [API接口](#api接口)
10. [最佳实践](#最佳实践)

---

## 概述

### 业务背景

OpenAero 方案管理系统是一个连接**创作者**和**客户**的平台：
- **创作者**：上传和销售航空航天领域的技术方案
- **客户**：浏览、购买和下载优质技术方案
- **平台**：提供审核、托管和交易服务

### 核心功能

- ✅ **方案创建**：创作者提交技术方案
- ✅ **多状态管理**：草稿、待审核、已通过、已发布等
- ✅ **审核流程**：管理员和审核员多维度评审
- ✅ **版本控制**：支持方案更新和版本追踪
- ✅ **文件托管**：支持多种类型的技术文档和资产
- ✅ **权限控制**：基于RLS的细粒度权限管理

---

## 方案状态流转

### 状态定义

```typescript
enum SolutionStatus {
  DRAFT           = 'DRAFT',           // 草稿
  PENDING_REVIEW  = 'PENDING_REVIEW',  // 待审核
  APPROVED        = 'APPROVED',        // 已通过
  REJECTED        = 'REJECTED',        // 已拒绝
  PUBLISHED       = 'PUBLISHED',       // 已发布
  ARCHIVED        = 'ARCHIVED'         // 已归档
}
```

### 状态流转图

```
┌─────────────────────────────────────────────────────────────────┐
│                      方案生命周期流程图                           │
└─────────────────────────────────────────────────────────────────┘

    [创建]
      ↓
  ┌─────────┐
  │  DRAFT  │ ←────────────────────┐
  │  草稿   │                      │
  └─────────┘                      │
      │                            │
      │ 提交审核                    │ 重新编辑
      ↓                            │
  ┌──────────────┐                 │
  │ PENDING_REVIEW│                │
  │   待审核      │                │
  └──────────────┘                 │
      │                            │
      ├─────审核通过────────┐       │
      │                    ↓       │
      │              ┌──────────┐  │
      │              │ APPROVED │  │
      │              │  已通过  │  │
      │              └──────────┘  │
      │                    │       │
      │                    │ 发布   │
      │                    ↓       │
      │              ┌───────────┐ │
      │              │ PUBLISHED │ │
      │              │  已发布   │ │
      │              └───────────┘ │
      │                    │       │
      │                    │ 下架   │
      │                    ↓       │
      │              ┌──────────┐  │
      │              │ ARCHIVED │  │
      │              │  已归档  │──┘
      │              └──────────┘
      │
      └─────审核拒绝────────┐
                          ↓
                    ┌──────────┐
                    │ REJECTED │
                    │  已拒绝  │
                    └──────────┘
                          │
                          │ 重新编辑或归档
                          ↓
                    [DRAFT or ARCHIVED]
```

### 状态转换规则

| 当前状态 | 可转换至 | 触发角色 | 条件 |
|---------|---------|---------|------|
| `DRAFT` | `PENDING_REVIEW` | Creator | 方案信息完整 |
| `DRAFT` | `ARCHIVED` | Creator/Admin | 放弃开发 |
| `PENDING_REVIEW` | `APPROVED` | Reviewer/Admin | 审核通过 |
| `PENDING_REVIEW` | `REJECTED` | Reviewer/Admin | 审核不通过 |
| `APPROVED` | `PUBLISHED` | Creator/Admin | 审核已通过 |
| `APPROVED` | `REJECTED` | Admin | 撤销通过 |
| `REJECTED` | `DRAFT` | Creator | 修改后重新提交 |
| `REJECTED` | `ARCHIVED` | Creator/Admin | 放弃修改 |
| `PUBLISHED` | `ARCHIVED` | Creator/Admin | 下架方案 |
| `ARCHIVED` | `DRAFT` | Creator/Admin | 恢复编辑 |

### 状态验证逻辑

```typescript
// 验证状态转换
function isValidTransition(
  fromStatus: SolutionStatus,
  toStatus: SolutionStatus,
  userRole: string
): boolean {
  const transitions = STATUS_TRANSITIONS.find(
    t => t.from === fromStatus && t.to === toStatus
  );
  
  if (!transitions) return false;
  
  if (transitions.requiredRole && 
      !transitions.requiredRole.includes(userRole)) {
    return false;
  }
  
  if (transitions.conditions) {
    return transitions.conditions();
  }
  
  return true;
}
```

---

## 角色与权限

### 角色定义

#### 1. **CREATOR（创作者）**
- ✅ 创建和编辑自己的方案
- ✅ 提交审核
- ✅ 查看自己方案的所有状态
- ✅ 发布已通过的方案
- ✅ 下架自己的方案
- ❌ 审核方案
- ❌ 查看其他创作者的草稿

#### 2. **REVIEWER（审核员）**
- ✅ 查看待审核方案
- ✅ 审核方案（批准/拒绝）
- ✅ 添加审核意见和评分
- ✅ 查看审核历史
- ❌ 直接修改方案内容
- ❌ 发布方案

#### 3. **ADMIN（管理员）**
- ✅ 所有 CREATOR 权限
- ✅ 所有 REVIEWER 权限
- ✅ 查看所有方案
- ✅ 修改任何方案
- ✅ 强制下架方案
- ✅ 分配审核员
- ✅ 查看统计数据

#### 4. **USER（普通用户）**
- ✅ 浏览已发布的方案
- ✅ 购买方案
- ✅ 下载已购买的方案
- ❌ 查看未发布的方案

### 权限矩阵

| 操作 | USER | CREATOR | REVIEWER | ADMIN |
|-----|------|---------|----------|-------|
| 浏览已发布方案 | ✅ | ✅ | ✅ | ✅ |
| 创建方案 | ❌ | ✅ | ❌ | ✅ |
| 编辑自己的草稿 | ❌ | ✅ | ❌ | ✅ |
| 提交审核 | ❌ | ✅ | ❌ | ✅ |
| 审核方案 | ❌ | ❌ | ✅ | ✅ |
| 发布方案 | ❌ | ✅ | ❌ | ✅ |
| 下架方案 | ❌ | ✅ (自己) | ❌ | ✅ (所有) |
| 查看审核历史 | ❌ | ✅ (自己) | ✅ | ✅ |
| 修改他人方案 | ❌ | ❌ | ❌ | ✅ |

---

## 工作流程详解

### 1. 方案创建流程

#### 步骤 1：创作者创建草稿

```typescript
// API: POST /api/solutions
const createSolution = async (data: {
  title: string;
  description: string;
  category: string;
  price: number;
  features?: string[];
  images?: string[];
  specs?: object;
  bom?: object;
}) => {
  // 验证创作者身份
  // 创建方案，初始状态为 DRAFT
  // 返回方案 ID
};
```

**前置条件**:
- ✅ 用户已认证为 CREATOR
- ✅ 创作者档案已创建

**创建内容**:
- 方案标题和描述
- 分类选择
- 价格设定
- 技术规格（可选）
- BOM清单（可选）

#### 步骤 2：编辑和完善方案

```typescript
// API: PUT /api/solutions/[id]
const updateSolution = async (id: string, data: Partial<Solution>) => {
  // 验证所有权
  // 验证状态（只能编辑 DRAFT 或 REJECTED）
  // 更新方案内容
};
```

**可编辑状态**:
- ✅ `DRAFT`
- ✅ `REJECTED`（需要修改后重新提交）
- ❌ 其他状态（需先撤回或下架）

#### 步骤 3：上传文件和资产

```typescript
// API: POST /api/solutions/[id]/assets
const uploadAsset = async (solutionId: string, file: File, metadata: {
  type: 'CAD' | 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'OTHER';
  title?: string;
  description?: string;
}) => {
  // 验证文件类型和大小
  // 上传到存储服务（Supabase Storage）
  // 创建资产记录
};
```

**支持的资产类型**:
- 📐 **CAD**: `.step`, `.stp`, `.iges`, `.igs`, `.stl`, `.obj`
- 📷 **IMAGE**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- 📄 **DOCUMENT**: `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`
- 🎥 **VIDEO**: `.mp4`, `.mov`, `.avi`

**文件大小限制**:
- 单个文件：最大 100MB
- 总存储：每个方案最大 1GB

#### 步骤 4：提交审核

```typescript
// API: POST /api/solutions/[id]/submit
const submitForReview = async (solutionId: string) => {
  // 验证方案完整性
  // 状态转换：DRAFT → PENDING_REVIEW
  // 创建审核任务
  // 通知审核员
};
```

**完整性检查**:
- ✅ 标题和描述不为空
- ✅ 至少有一个分类
- ✅ 价格大于 0
- ✅ 至少有一张图片
- ✅ 至少有一个资产文件

---

### 2. 审核流程

#### 步骤 1：分配审核员

```typescript
// API: POST /api/admin/solutions/[id]/review
const startReview = async (solutionId: string, reviewerId: string) => {
  // 创建审核记录
  // 分配审核员
  // 记录审核开始时间
  // 通知审核员
};
```

**分配策略**:
- 🔄 **轮询分配**：按顺序分配给可用审核员
- ⚖️ **负载均衡**：分配给当前任务最少的审核员
- 🎯 **专业匹配**：根据方案类别分配专业审核员

#### 步骤 2：审核评估

审核员需要评估以下维度：

| 评估维度 | 权重 | 评分标准 |
|---------|------|---------|
| **质量评分** (Quality) | 30% | 技术准确性、完整性 |
| **完整度** (Completeness) | 25% | 文档、资产、BOM齐全度 |
| **创新性** (Innovation) | 25% | 技术创新、独特性 |
| **市场潜力** (Market Potential) | 20% | 实用性、需求度 |

**评分范围**: 1-10分（每个维度）

#### 步骤 3：审核决策

```typescript
// API: PUT /api/admin/solutions/[id]/review
const completeReview = async (solutionId: string, decision: {
  decision: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';
  score?: number;
  qualityScore?: number;
  completeness?: number;
  innovation?: number;
  marketPotential?: number;
  comments?: string;
  suggestions?: string[];
}) => {
  // 更新审核记录
  // 状态转换
  // 通知创作者
};
```

**决策类型**:

1. **APPROVED（通过）**
   - 综合评分 ≥ 7.0
   - 所有维度评分 ≥ 6.0
   - 状态转换：`PENDING_REVIEW` → `APPROVED`

2. **REJECTED（拒绝）**
   - 综合评分 < 5.0
   - 存在重大技术问题
   - 状态转换：`PENDING_REVIEW` → `REJECTED`

3. **NEEDS_REVISION（需要修改）**
   - 5.0 ≤ 综合评分 < 7.0
   - 部分内容需要完善
   - 状态转换：`PENDING_REVIEW` → `DRAFT`
   - 附带修改建议

#### 步骤 4：审核历史记录

```sql
-- solution_reviews 表记录完整审核历史
SELECT 
  sr.id,
  sr.from_status,
  sr.to_status,
  sr.decision,
  sr.score,
  sr.comments,
  sr.reviewed_at,
  u.display_name as reviewer_name
FROM solution_reviews sr
JOIN user_profiles u ON sr.reviewer_id = u.id
WHERE sr.solution_id = :solution_id
ORDER BY sr.created_at DESC;
```

---

### 3. 发布流程

#### 步骤 1：创作者发布

```typescript
// API: POST /api/solutions/[id]/publish
const publishSolution = async (solutionId: string) => {
  // 验证状态为 APPROVED
  // 状态转换：APPROVED → PUBLISHED
  // 设置发布时间
  // 触发索引更新
  // 通知关注者
};
```

**前置条件**:
- ✅ 状态为 `APPROVED`
- ✅ 创作者确认发布
- ✅ 所有必需文件已上传

#### 步骤 2：公开展示

发布后，方案将：
- ✅ 在方案市场中展示
- ✅ 允许所有用户浏览
- ✅ 支持搜索和筛选
- ✅ 生成唯一的访问链接

---

### 4. 版本更新流程

#### 更新已发布方案

```typescript
// API: POST /api/solutions/[id]/versions
const createNewVersion = async (solutionId: string, changes: {
  versionNotes: string;
  updates: Partial<Solution>;
}) => {
  // 克隆当前版本
  // 创建新版本记录
  // 版本号自增
  // 保留审核历史
};
```

**版本控制规则**:
- 📌 主版本更新（Major）：重大功能变更
- 🔧 次版本更新（Minor）：功能优化
- 🐛 修订版本（Patch）：Bug修复

**版本格式**: `v{major}.{minor}.{patch}`  
**示例**: `v1.0.0` → `v1.1.0` → `v2.0.0`

---

## 文件管理

### 文件存储架构

```
Supabase Storage
├── solutions/
│   ├── {solution_id}/
│   │   ├── assets/           # 技术资产
│   │   │   ├── cad/
│   │   │   ├── images/
│   │   │   ├── documents/
│   │   │   └── videos/
│   │   ├── thumbnails/       # 缩略图
│   │   └── previews/         # 预览文件
```

### 文件上传流程

```typescript
// 1. 客户端请求上传签名
const getUploadUrl = async (metadata: {
  solutionId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}) => {
  // 验证权限
  // 生成预签名URL
  // 返回上传URL和文件路径
};

// 2. 客户端直接上传到Storage
const uploadFile = async (file: File, uploadUrl: string) => {
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type }
  });
};

// 3. 服务端创建资产记录
const createAssetRecord = async (metadata: AssetMetadata) => {
  // 创建 assets 表记录
  // 关联到方案
};
```

### 文件访问控制

**RLS策略**:
```sql
-- 公开访问已发布方案的文件
CREATE POLICY "public_access_published_assets"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'solutions' AND
  EXISTS (
    SELECT 1 FROM solutions s
    WHERE s.id = (storage.foldername(name))[2]::uuid
    AND s.status = 'PUBLISHED'
  )
);

-- 创作者访问自己方案的所有文件
CREATE POLICY "creator_access_own_assets"
ON storage.objects FOR ALL
USING (
  bucket_id = 'solutions' AND
  EXISTS (
    SELECT 1 FROM solutions s
    JOIN creator_profiles cp ON s.creator_id = cp.id
    WHERE s.id = (storage.foldername(name))[2]::uuid
    AND cp.user_id = auth.uid()
  )
);
```

---

## 版本控制

### 版本记录表

```sql
CREATE TABLE solution_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_id UUID NOT NULL REFERENCES solutions(id),
  version VARCHAR(20) NOT NULL,
  version_notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  -- 快照数据
  snapshot JSONB NOT NULL,
  UNIQUE(solution_id, version)
);
```

### 版本管理API

```typescript
// 获取版本历史
GET /api/solutions/[id]/versions

// 创建新版本
POST /api/solutions/[id]/versions

// 回滚到指定版本
POST /api/solutions/[id]/versions/[versionId]/rollback
```

---

## 审核机制

### 审核记录表

```sql
CREATE TABLE solution_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_id UUID NOT NULL REFERENCES solutions(id),
  reviewer_id UUID NOT NULL REFERENCES user_profiles(id),
  from_status solution_status NOT NULL,
  to_status solution_status NOT NULL,
  status review_status DEFAULT 'PENDING',
  decision review_decision,
  score DECIMAL(3,1) CHECK (score >= 1 AND score <= 10),
  quality_score DECIMAL(3,1),
  completeness DECIMAL(3,1),
  innovation DECIMAL(3,1),
  market_potential DECIMAL(3,1),
  comments TEXT,
  decision_notes TEXT,
  suggestions JSONB,
  review_started_at TIMESTAMP,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 审核流程API

```typescript
// 开始审核
POST /api/admin/solutions/[id]/review
Body: { reviewerId: string }

// 完成审核
PUT /api/admin/solutions/[id]/review
Body: {
  decision: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION',
  score: number,
  qualityScore: number,
  completeness: number,
  innovation: number,
  marketPotential: number,
  comments?: string,
  suggestions?: string[]
}

// 获取审核历史
GET /api/admin/solutions/[id]/review
```

---

## 通知系统

### 通知触发点

| 事件 | 接收者 | 通知方式 |
|-----|-------|---------|
| 方案提交审核 | 审核员 | 邮件 + 站内信 |
| 审核通过 | 创作者 | 邮件 + 站内信 |
| 审核拒绝 | 创作者 | 邮件 + 站内信 |
| 需要修改 | 创作者 | 邮件 + 站内信 |
| 方案发布 | 关注者 | 站内信 |
| 方案被购买 | 创作者 | 邮件 + 站内信 |

### 通知模板示例

```typescript
// 审核通过通知
const approvalNotification = {
  to: creator.email,
  subject: '恭喜！您的方案审核已通过',
  template: 'solution-approved',
  data: {
    creatorName: creator.name,
    solutionTitle: solution.title,
    score: review.score,
    reviewComments: review.comments,
    publishUrl: `/solutions/${solution.id}/publish`
  }
};
```

---

## API接口

### 方案管理API

#### 创建方案
```http
POST /api/solutions
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "高性能无人机设计方案",
  "description": "基于碳纤维的轻量化设计...",
  "category": "UAV",
  "price": 299.00,
  "features": ["轻量化", "长续航", "高机动性"],
  "specs": {
    "weight": "2.5kg",
    "range": "50km",
    "flightTime": "45min"
  }
}
```

#### 更新方案
```http
PUT /api/solutions/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "description": "更新后的描述...",
  "price": 349.00
}
```

#### 提交审核
```http
POST /api/solutions/{id}/submit
Authorization: Bearer {token}
```

#### 发布方案
```http
POST /api/solutions/{id}/publish
Authorization: Bearer {token}
```

### 审核API

#### 开始审核
```http
POST /api/admin/solutions/{id}/review
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "reviewerId": "reviewer-uuid"
}
```

#### 完成审核
```http
PUT /api/admin/solutions/{id}/review
Authorization: Bearer {reviewer_token}
Content-Type: application/json

{
  "decision": "APPROVED",
  "score": 8.5,
  "qualityScore": 9,
  "completeness": 8,
  "innovation": 9,
  "marketPotential": 8,
  "comments": "优秀的技术方案，设计思路清晰..."
}
```

---

## 最佳实践

### 创作者最佳实践

1. **完整的方案描述**
   - ✅ 详细的技术说明
   - ✅ 清晰的应用场景
   - ✅ 准确的技术参数

2. **高质量的资产文件**
   - ✅ 提供多角度的图片
   - ✅ 上传完整的CAD文件
   - ✅ 包含详细的BOM清单
   - ✅ 提供使用说明文档

3. **合理的定价**
   - ✅ 参考市场同类方案
   - ✅ 考虑技术复杂度
   - ✅ 体现方案价值

4. **及时响应审核意见**
   - ✅ 认真阅读审核建议
   - ✅ 快速修改问题
   - ✅ 重新提交审核

### 审核员最佳实践

1. **公平公正**
   - ✅ 基于客观标准评分
   - ✅ 避免主观偏见
   - ✅ 一视同仁

2. **详细反馈**
   - ✅ 指出具体问题
   - ✅ 提供改进建议
   - ✅ 说明拒绝理由

3. **高效审核**
   - ✅ 在3个工作日内完成
   - ✅ 及时沟通问题
   - ✅ 记录审核过程

### 平台管理最佳实践

1. **监控审核质量**
   - ✅ 定期抽查审核结果
   - ✅ 评估审核员表现
   - ✅ 优化审核标准

2. **优化用户体验**
   - ✅ 简化提交流程
   - ✅ 提供清晰的指引
   - ✅ 及时处理投诉

3. **数据分析**
   - ✅ 分析审核通过率
   - ✅ 统计热门分类
   - ✅ 追踪方案质量趋势

---

## 常见问题

### Q1: 方案审核需要多长时间？
**A**: 通常在3个工作日内完成。复杂方案可能需要更长时间。

### Q2: 审核被拒绝后可以重新提交吗？
**A**: 可以。修改问题后可以重新提交审核。

### Q3: 可以修改已发布的方案吗？
**A**: 需要先下架方案，修改后重新审核和发布。

### Q4: 方案被购买后还能下架吗？
**A**: 不建议下架已有购买记录的方案。如必须下架，需确保购买者仍能访问。

### Q5: 如何提高审核通过率？
**A**: 
- 提供完整详细的技术文档
- 上传高质量的资产文件
- 确保BOM清单准确完整
- 定价合理

---

## 相关资源

- [API完整文档](./API_DOCUMENTATION.md)
- [数据库架构](./DATABASE_SCHEMA.md)
- [系统架构](./ARCHITECTURE.md)
- [创作者指南](../user/CREATOR_GUIDE.md)（待创建）
- [审核员手册](../operations/REVIEWER_HANDBOOK.md)（待创建）

---

**文档维护**: OpenAero 技术团队  
**反馈渠道**: tech@openaero.com

# 📦 OpenAero PRD 补充章节：阶段3-4平台闭环功能

**文档版本**: v1.0  
**更新时间**: 2025-10-26  
**适用阶段**: 阶段3（第5-6月）、阶段4（第7-8月）  
**目标**: 实现“创作者提交 → 审核认证 → 商品上架 → 收益分成”的平台商业闭环  
**适配对象**: AI 自动编码系统、全栈开发团队、项目管理人员

---

## 1. 用户认证与权限系统

### 功能目标
- 支持用户注册、登录、角色管理与权限控制

### 核心要素
- [ ] 邮箱注册与验证
- [ ] 登录与安全认证（JWT）
- [ ] 找回密码（重设邮件）
- [ ] 支持三类角色：访客、创作者、管理员
- [ ] 基于角色的访问控制（RBAC）

### 技术提示
- 使用 `next-auth` + JWT 持久化身份
- 加密库使用 `bcrypt`
- 角色字段加入 `User` 模型（Prisma）

---

## 2. 创作者方案提交系统

### 功能目标
- 允许创作者提交设计提案，上传技术材料，进入评审流程

### 核心要素
- [ ] 创作者资格申请表单（+身份证明/BOM上传）
- [ ] 创建“无人机解决方案”表单
- [ ] 附件支持：PDF, CAD, CSV, ZIP等
- [ ] 状态管理：草稿 → 待审 → 审核通过 → 商品绑定

### 技术提示
- 使用 Prisma 建模 Solution, CreatorApplication
- 上传可用 `@uploadthing/react` / `next-cloudinary`
- 附件结构保存在 S3/IPFS，关联 `solutionAsset[]`

---

## 3. 审核与认证工作流

### 功能目标
- 管理员对创作者与方案进行专业评审、打回或通过

### 核心要素
- [ ] 后台审核队列（分页/搜索/筛选）
- [ ] 审核操作：通过 / 打回（附理由） / 拒绝
- [ ] 审核历史记录 + 审核人签名
- [ ] OpenAero认证徽章加注（通过后）

### 技术提示
- 审核状态字段枚举：`DRAFT | PENDING | APPROVED | REJECTED`
- 审核记录独立建模 `ReviewLog[]`
- 审核徽章可作为前端组件条件渲染

---

## 4. 商品化系统（解决方案 → 商品）

### 功能目标
- 将认证通过的方案转为可售商品，上架商城

### 核心要素
- [ ] 商品管理面板（基于solution ID自动生成草稿）
- [ ] 商品信息编辑：名称、售价、库存、主图、SKU编号
- [ ] 上架/下架状态切换
- [ ] 商品展示页与搜索整合

### 技术提示
- 商品模型 `Product` 与 `Solution` 建立 `1:1` 绑定
- 商品ID用于订单、支付系统绑定
- 前端展示参考 Shopify 样式设计

---

## 5. 支付与收益分成系统

### 功能目标
- 处理客户支付、创作者收益分账、财务对账与提现

### 核心要素
- [ ] 支持 Stripe Connect / PayPal 商户
- [ ] 收益分成机制：平台抽佣5%，创作者收95%
- [ ] 提现界面（绑定PayPal账户、打款历史）
- [ ] 财务中心：订单、收入、对账、开票信息

### 技术提示
- Stripe 推荐使用 `stripe-connect` 标准托管分账模式
- 分成逻辑在订单生成阶段处理后端转账逻辑
- 金额字段统一用分（integer）避免浮点误差

---

## 6. 供应链打样支持模块

### 功能目标
- 支持管理员将审核通过方案提交给合作工厂试产

### 核心要素
- [ ] 工厂管理界面（名称、联系人、地址、品类）
- [ ] 提交试产订单（绑定solution ID + 数量 + 截止时间）
- [ ] 打样状态跟踪（待确认、生产中、已交付）
- [ ] 打样文件打包导出（zip）

### 技术提示
- 后台操作流程采用状态流图实现
- 试产单模型：`SampleOrder`、状态字段 `enum`

---

## 7. 管理后台 & 分析仪表盘

### 功能目标
- 提供内容审核、订单、收益、创作者行为等全局视角

### 核心要素
- [ ] 平台关键数据指标卡片（DAU、收入、方案通过率）
- [ ] 内容审核：用户、方案、商品管理
- [ ] 订单与收入对账报表导出（CSV, PDF）
- [ ] 审核日志 / 审计追踪

### 技术提示
- 数据可视化可用 `recharts`, `react-query`, `swr`
- 导出 PDF 可用 `@react-pdf/renderer`
- 管理员前端建议单独 `/admin` 路由与 Auth 中间件保护

---

## 8. 移动端 / PWA 支持

### 功能目标
- 支持客户在移动端浏览、下单；创作者查看审核/收益状态

### 核心要素
- [ ] 方案页、商品页、商城页移动端优化
- [ ] PWA 安装支持（支持添加到主屏）
- [ ] 通知栏集成（审核进度提醒、订单状态提醒）

### 技术提示
- 使用 Next.js 的 PWA 插件 + `manifest.json` 配置
- 消息推送可用 `onesignal` 或自建 `web-push` 实现
- 响应式布局采用 Tailwind 的 `sm:` / `md:` / `xl:` 断点控制

---

## 附录：数据库模型建议（Prisma）

```ts
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         Role     @default(CREATOR)
  profile      Profile?
  createdAt    DateTime @default(now())
  // ...
}

enum Role {
  VISITOR
  CREATOR
  ADMIN
}

model Solution {
  id        String     @id @default(cuid())
  title     String
  status    SolutionStatus
  version   Int
  assets    Asset[]
  product   Product?
  reviewLog ReviewLog[]
  // ...
}

enum SolutionStatus {
  DRAFT
  PENDING
  APPROVED
  REJECTED
}

model Product {
  id            String   @id @default(cuid())
  solutionId    String   @unique
  title         String
  priceInCents  Int
  stock         Int
  isPublished   Boolean  @default(false)
  // ...
}
```

---

**文档维护者**: OpenAero PM团队  
**面向开发对象**: AI自动编码工具 / 前后端开发团队 / DevOps自动部署链
---

## 9. 平台管理员账户与后台管理系统

### 功能目标
- 提供安全、高权限的管理员账户体系与后台界面，支撑平台运营、审核和内容监管

### 核心要素
- [ ] 超级管理员账号初始化方式（硬编码/数据库种子）
- [ ] 管理员权限粒度配置（可增删其他管理员）
- [ ] 后台入口与仪表盘（如 `/admin`）
- [ ] 后台功能权限隔离（内容审核、财务结算、工厂管理等）

### 技术提示
- 使用 `next-auth` Session + 权限中间件保护 `/admin`
- 所有管理员行为写入 `audit_log` 审计日志表


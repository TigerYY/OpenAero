# Project Context

## Purpose
开元空御是一个社区驱动的开放式无人机解决方案平台，连接全球无人机创作者与专业客户。我们致力于将优秀的无人机创新设计进行专业验证、生产和销售，为创作者提供50%的利润分成，为客户提供经过认证的高性能无人机核心套件。

**核心价值主张**:
- **创作者端**: 提供从方案提交到收益获取的完整商业化支持
- **客户端**: 展示经过认证的无人机核心套件，提供透明定价和BOM清单
- **平台端**: 建立严格的认证标准和共赢的开放生态模式

## Tech Stack

### 前端技术栈
- **框架**: Next.js 14.1.0 (App Router)
- **语言**: TypeScript 5.3.3
- **样式**: Tailwind CSS 3.4.1 + Headless UI 1.7.19
- **动画**: Framer Motion 10.16.16
- **国际化**: next-intl 4.4.0 (支持中文/英文)
- **UI组件**: Radix UI + Headless UI + Custom Components
- **图标**: Heroicons 2.0.18 + Lucide React 0.548.0
- **表单**: React Hook Form (通过自定义组件)
- **通知**: Sonner 2.0.7
- **主题**: next-themes 0.4.6
- **状态管理**: Class Variance Authority 0.7.1 + 自定义Context
- **数据验证**: Zod 3.22.4
- **测试**: Jest 29.7.0 + React Testing Library 14.1.2 + Playwright 1.40.1

### 后端技术栈
- **运行时**: Node.js 18+ (LTS, engines要求 >=18.0.0)
- **API**: Next.js API Routes (App Router)
- **数据库**: PostgreSQL + Prisma ORM 5.22.0
- **认证**: Supabase Auth (@supabase/ssr 0.7.0, @supabase/supabase-js 2.81.0)
- **文件处理**: Multer 2.0.2 + Sharp 0.34.4 (图片优化)
- **邮件**: Nodemailer 7.0.10
- **监控**: Sentry (@sentry/nextjs 10.20.0, @sentry/profiling-node 10.20.0) + Prometheus (prom-client 15.1.3)
- **文件存储**: AWS S3 + Cloudflare R2 (生产环境)
- **推送通知**: web-push 3.6.7
- **密码处理**: bcrypt + bcryptjs
- **文件压缩**: JSZip 3.10.1
- **日期处理**: date-fns 4.1.0 + moment 2.30.1
- **工具库**: fs-extra 11.3.2, uuid 13.0.0, yaml 2.8.1

### 基础设施
- **部署平台**: Vercel (前端) + AWS EKS (后端)
- **容器化**: Docker + Docker Compose (支持dev/test/production环境)
- **监控**: Prometheus + Grafana + Sentry + DataDog
- **CI/CD**: GitHub Actions + ArgoCD
- **Kubernetes**: k8s配置目录包含deployment, service, ingress配置
- **Nginx**: 反向代理和SSL配置

## Project Conventions

### Code Style

#### 命名规范
- **文件命名**: 组件使用PascalCase，页面使用kebab-case，工具使用camelCase
- **变量命名**: camelCase，常量使用UPPER_SNAKE_CASE
- **函数命名**: camelCase，类使用PascalCase
- **接口命名**: PascalCase + I前缀

#### 格式化规则
- **缩进**: 2个空格
- **引号**: 单引号优先
- **分号**: 必须使用
- **行长度**: 最大100字符
- **导入顺序**: 第三方库 → 内部模块 (@/...) → 相对路径
- **路径别名**: 使用`@/`作为src目录别名
  - `@/components/*` → `src/components/*`
  - `@/lib/*` → `src/lib/*`
  - `@/hooks/*` → `src/hooks/*`
  - `@/types/*` → `src/types/*`
  - `@/messages/*` → `messages/*`

#### TypeScript配置
- **严格模式**: 启用所有严格检查选项
- **目标**: ES2022
- **模块**: ESNext
- **JSX**: preserve (Next.js处理)
- **路径解析**: bundler模式
- **类型检查**: 启用noImplicitAny, strictNullChecks等

### Architecture Patterns

#### 微服务架构演进
```
阶段1 (MVP): 单体应用 (Next.js Full-Stack)
阶段2 (Growth): 服务分离 (前端 + API Gateway + 业务服务)
阶段3 (Scale): 微服务架构 (独立部署的微服务集群)
```

#### 组件架构分层
- **页面组件** (`src/app/`): Next.js App Router页面，使用kebab-case路由
- **布局组件** (`src/components/layout/`): AppLayout, AuthLayout, DefaultLayout, MainLayout等
- **业务组件** (`src/components/business/`): SolutionCard, PaymentModal, NotificationCenter等
- **UI组件** (`src/components/ui/`): Button, Card, Dialog, Input等基础组件
- **区块组件** (`src/components/sections/`): HeroSection, SolutionsSection, CreatorBenefits等
- **功能组件**: auth/, shop/, admin/, monitoring/, security/等业务功能模块

#### 目录结构规范
```
src/
├── app/                    # Next.js App Router
│   ├── [locale]/          # 国际化路由 (zh-CN, en-US)
│   ├── api/               # API路由 (RESTful)
│   └── globals.css        # 全局样式
├── components/            # 组件库
│   ├── ui/               # 基础UI组件
│   ├── layout/           # 布局组件
│   ├── business/         # 业务组件
│   ├── sections/         # 页面区块
│   └── [feature]/        # 功能模块组件
├── lib/                  # 工具库和业务逻辑
├── hooks/                # 自定义React Hooks
├── types/                # TypeScript类型定义
├── contexts/             # React Context
└── config/               # 配置文件
```

### Testing Strategy

#### 测试金字塔
- **单元测试**: 覆盖率 ≥ 85% (全局), ≥ 90% (components), ≥ 80% (lib/hooks)
- **集成测试**: 覆盖率 ≥ 60%，验证服务间通信
- **E2E测试**: Playwright测试，覆盖核心用户流程

#### 测试配置
- **Jest**: 使用next/jest配置，支持TypeScript和JSX
- **测试环境**: jsdom (组件测试)
- **覆盖率工具**: 支持text, lcov, html, json-summary, clover格式
- **测试超时**: 10秒
- **并行执行**: 最多50% CPU核心

#### 测试文件命名和位置
- `Button.test.tsx` - 组件测试 (与组件同目录或`__tests__/`)
- `userService.test.ts` - 服务测试 (`tests/lib/`)
- `api.test.ts` - API测试 (`tests/api/`)
- `auth.e2e.spec.ts` - E2E测试 (`tests/e2e/`)
- 测试文件匹配模式: `**/*.{test,spec}.{js,jsx,ts,tsx}`

### Git Workflow

#### 分支策略
- `main` - 生产环境分支
- `develop` - 开发环境分支
- `feature/*` - 功能分支
- `hotfix/*` - 紧急修复分支
- `release/*` - 版本发布分支

#### 提交规范
```
<type>(<scope>): <description>

类型: feat, fix, docs, style, refactor, test, chore
示例: feat(auth): add user registration with email verification
```

## Domain Context

### 核心业务实体
- **用户** (UserProfile): 创作者、客户、管理员，基于Supabase Auth扩展
- **方案** (Solution): 无人机设计解决方案，支持版本管理和文件上传
- **产品** (Product): 经过认证的无人机核心套件，包含BOM清单和定价
- **订单** (Order): 购买记录和交易信息，支持多种支付方式
- **认证** (Certification): 性能验证和质量标准，包含测试报告
- **创作者** (CreatorProfile): 创作者资料和收益信息
- **工厂** (Factory): 生产合作伙伴信息
- **购物车** (Cart): 用户购物车管理
- **通知** (Notification): 系统通知和消息

### 业务流程
1. **创作者提交方案** → **平台审核验证** → **生产销售** → **利润分成**
2. **客户浏览产品** → **下单购买** → **获取套件** → **组装使用**

### 国际化支持
- **支持语言**: 中文 (zh-CN, 默认), 英文 (en-US)
- **实现方式**: next-intl 4.4.0
- **路由结构**: `/[locale]/...` (如 `/zh-CN/solutions`, `/en-US/solutions`)
- **翻译文件**: `messages/zh-CN.json`, `messages/en-US.json`
- **时区配置**: Asia/Shanghai
- **语言检测**: 支持浏览器检测和服务器端检测
- **语言切换**: 通过ClientLanguageSwitcher组件实现

### 认证标准
- 超过50项实验室和外场测试
- 性能验证报告和安全可靠性保证
- "OpenAero Certified"品牌标准

## Current Development Status

### 开发分支
- **当前分支**: `006-user-auth-system`
- **分支状态**: 与origin同步，有未提交的修改
- **最近提交**: 用户认证系统相关功能

### 当前修改状态
#### 已修改文件
- `openspec/AGENTS.md` - OpenSpec代理配置
- `src/app/api/admin/dashboard/stats/route.ts` - 管理员统计API
- `src/app/api/admin/solutions/filter/route.ts` - 方案过滤API
- `src/app/api/admin/solutions/queue/route.ts` - 方案队列API
- `src/components/layout/AdminLayout.tsx` - 管理员布局组件
- `src/lib/auth-helpers.ts` - 认证辅助函数

#### 新增文件
- `ULTRA_SIMPLE_FIX.sql` - 数据库修复脚本
- `openspec/.codebuddy/` - CodeBuddy配置目录
- `openspec/CODEBUDDY.md` - CodeBuddy文档
- `openspec/changes/fix-role-field-consistency/` - 角色字段一致性修复

### 最近解决的问题
1. **用户认证系统**: 完善了用户注册、登录和权限管理
2. **角色字段一致性**: 修复了`role`和`roles`字段的不一致问题
3. **管理员页面**: 修复了管理员页面的导航和权限问题
4. **API路由**: 统一了权限检查机制，使用`roles`数组而非单一`role`字段

### 技术债务和改进计划
- **类型安全**: 继续完善TypeScript类型定义
- **测试覆盖率**: 提高E2E测试覆盖率
- **性能优化**: 优化数据库查询和API响应时间
- **代码质量**: 统一代码风格和最佳实践

## Important Constraints

### 技术约束
- **阶段驱动开发**: 必须严格遵循DEVELOPMENT_PHASES.md中的开发阶段顺序
- **微服务演进**: 从单体应用平滑过渡到微服务架构
- **国际化支持**: 支持多语言和多地区部署 (zh-CN, en-US)
- **移动端适配**: 响应式设计，支持PWA (Service Worker已配置)
- **Node.js版本**: 必须 >= 18.0.0 (LTS)
- **TypeScript严格模式**: 必须启用所有严格检查
- **构建输出**: standalone模式，支持Docker部署

### 业务约束
- **创作者利润分成**: 固定50%利润分成模式
- **认证标准**: 严格的性能验证和质量保证
- **供应链合作**: 与T-Motor、CUAV、Holybro等顶级供应商合作
- **合规要求**: 符合中国ICP备案要求 (粤ICP备2020099654号-3)

### 安全约束
- **数据保护**: 敏感数据加密存储
- **HTTPS加密**: 全站SSL加密
- **速率限制**: 防止暴力攻击
- **权限控制**: 基于角色的访问控制(RBAC)
- **RLS策略**: 数据库行级安全策略
- **认证一致性**: 统一使用`roles`数组进行权限验证
- **API安全**: 所有API路由必须进行权限检查
- **环境变量**: 敏感配置通过环境变量管理
- **输入验证**: 使用Zod进行严格的数据验证

### 开发规范约束
- **国际化优先**: 所有用户界面必须支持中英双语
- **组件复用**: 优先使用现有的UI组件库
- **API设计**: RESTful设计，统一的响应格式
- **错误处理**: 统一的错误处理和用户反馈机制
- **日志记录**: 关键操作必须记录日志
- **性能监控**: 使用Sentry进行错误监控和性能追踪
- **代码审查**: 所有代码必须通过ESLint和TypeScript检查
- **Git规范**: 遵循Conventional Commits规范

## External Dependencies

### 第三方服务
- **Supabase**: 初期数据库和认证服务
- **AWS**: 生产环境云服务 (S3, EKS, RDS)
- **Vercel**: 前端部署平台
- **Cloudflare**: CDN和安全防护
- **Sentry**: 错误监控
- **DataDog**: 基础设施监控

### API集成
- **支付网关**: 支持支付宝、微信支付 (webhook集成)
- **邮件服务**: Nodemailer集成，支持用户通知和验证
- **短信服务**: 双因素认证 (未来集成)
- **地图服务**: 位置相关功能 (未来集成)
- **物流服务**: 订单配送跟踪 (未来集成)
- **AI服务**: 方案分析、优化建议、智能推荐 (AI路由)

### API路由结构
```
/api/
├── auth/              # 认证相关 (login, register, logout, callback)
├── users/             # 用户管理
├── solutions/         # 方案管理 (CRUD, 版本控制, 文件上传)
├── products/          # 产品管理
├── orders/            # 订单管理
├── payments/          # 支付处理 (创建订单, webhook, 状态查询)
├── creators/          # 创作者相关
├── admin/             # 管理员功能 (统计, 审核, 监控)
├── files/             # 文件上传和管理
├── notifications/     # 通知管理
├── chat/              # 聊天系统
├── ai/                # AI功能 (分析, 优化, 推荐)
└── health/            # 健康检查
```

### 开发工具
- **GitHub**: 代码托管和CI/CD
- **Docker**: 容器化部署 (Dockerfile, docker-compose.yml)
- **Kubernetes**: 容器编排 (k8s/目录)
- **Prometheus**: 监控系统 (prometheus.yml, monitoring/)
- **Grafana**: 数据可视化 (monitoring/grafana/)
- **Husky**: Git hooks管理 (8.0.3)
- **Lint-staged**: 提交前代码检查 (15.2.0)
- **ESLint**: 代码质量检查 (支持自定义规则，如no-hardcoded-routes)
- **Prettier**: 代码格式化 (3.1.1)
- **Playwright**: E2E测试框架 (1.40.1)
- **增强配置**: 自定义ESLint、Prettier、TypeScript配置文件
  - `.eslintrc.enhanced.json` - 更严格的代码质量检查
  - `.prettierrc.enhanced` - 统一的代码格式化规则
  - `tsconfig.enhanced.json` - 更严格的TypeScript检查
- **路由管理**: 自定义脚本检查和修复硬编码路由
- **数据库工具**: BOM迁移和验证脚本、用户配置同步工具

### 环境变量配置
主要环境变量包括:
- **应用配置**: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME`
- **国际化**: `NEXT_PUBLIC_DEFAULT_LOCALE`, `NEXT_PUBLIC_SUPPORTED_LOCALES`
- **数据库**: `DATABASE_URL`, `DIRECT_URL` (Prisma连接)
- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Redis**: `REDIS_URL`
- **监控**: `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`
- **功能开关**: `NEXT_PUBLIC_ENABLE_ANALYTICS`, `NEXT_PUBLIC_ENABLE_MONITORING`
- **邮件服务**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- **文件存储**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`
- **推送通知**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`
- **支付集成**: `ALIPAY_APP_ID`, `WECHAT_PAY_MCH_ID`, `PAYMENT_SECRET_KEY`

### Next.js配置特性
- **输出模式**: `standalone` (Docker优化)
- **SWC编译**: 启用SWC压缩和优化
- **React严格模式**: 启用
- **图片优化**: 支持WebP和AVIF格式
- **国际化路由**: `/[locale]/` 结构
- **服务器组件**: 外部包配置优化
- **包导入优化**: lucide-react, @headlessui/react
- **压缩**: 启用Gzip压缩
- **构建ID**: 自定义生成逻辑

### TypeScript增强配置
- **严格模式**: 启用所有严格检查
- **路径别名**: 完整的`@/`路径映射
- **类型检查**: noImplicitAny, strictNullChecks, noUncheckedIndexedAccess
- **构建优化**: 增量编译和类型检查
- **测试类型**: Jest, Testing Library类型支持

### 构建和部署脚本
主要npm脚本:

#### 开发相关
- **开发**: `npm run dev` (支持端口配置: `dev:3000`, `dev:3001`)
- **构建**: `npm run build` (生产构建)
- **启动**: `npm run start`, `npm run start:3000`
- **分析**: `npm run analyze` (bundle分析)

#### 代码质量
- **基础检查**: `npm run lint`, `npm run type-check`, `npm run format`
- **增强检查**: `npm run lint:enhanced`, `npm run type-check:enhanced`, `npm run format:enhanced`
- **综合检查**: `npm run quality:check`, `npm run quality:check:enhanced`
- **安全审计**: `npm run security:audit`, `npm run security:check`
- **依赖检查**: `npm run check-dependencies`, `npm run bundle:analyze`

#### 测试相关
- **基础测试**: `npm test`, `npm run test:watch`, `npm run test:coverage`
- **增强测试**: `npm run test:enhanced`, `npm run test:coverage:enhanced`, `npm run test:watch:enhanced`
- **CI测试**: `npm run test:ci`
- **E2E测试**: `npm run test:e2e`

#### 数据库相关
- **Prisma操作**: `npm run db:generate`, `npm run db:migrate`, `npm run db:studio`, `npm run db:push`
- **数据库管理**: `npm run db:init`, `npm run db:reset`, `npm run db:seed`, `npm run db:rebuild`
- **表管理**: `npm run db:create-missing`, `npm run db:sync-profiles`
- **BOM管理**: `npm run bom:check`, `npm run bom:migrate`, `npm run bom:validate`
- **RLS策略**: `npm run db:rls`

#### 路由管理
- **路由检查**: `npm run routes:check`, `npm run check:routes`, `npm run check:routes:ci`
- **路由修复**: `npm run routes:fix`, `npm run fix:routes`

#### Docker和部署
- **Docker**: `npm run docker:build`, `npm run docker:run`, `npm run docker:dev`, `npm run docker:prod`
- **Docker管理**: `npm run docker:down`, `npm run docker:logs`
- **部署**: `npm run deploy:dev`, `npm run deploy:staging`, `npm run deploy:prod`

#### Kubernetes
- **K8s操作**: `npm run k8s:apply`, `npm run k8s:delete`, `npm run k8s:status`

#### 工具脚本
- **端口管理**: `npm run clean-ports`
- **环境验证**: `npm run env:validate`, `npm run config:validate`
- **项目清理**: `npm run clean`, `npm run fresh`
- **MCP配置**: `npm run mcp:setup`, `npm run mcp:test`

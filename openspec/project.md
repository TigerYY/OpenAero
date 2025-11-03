# Project Context

## Purpose
开元空御是一个社区驱动的开放式无人机解决方案平台，连接全球无人机创作者与专业客户。我们致力于将优秀的无人机创新设计进行专业验证、生产和销售，为创作者提供50%的利润分成，为客户提供经过认证的高性能无人机核心套件。

**核心价值主张**:
- **创作者端**: 提供从方案提交到收益获取的完整商业化支持
- **客户端**: 展示经过认证的无人机核心套件，提供透明定价和BOM清单
- **平台端**: 建立严格的认证标准和共赢的开放生态模式

## Tech Stack

### 前端技术栈
- **框架**: Next.js 14+ (App Router)
- **语言**: TypeScript 5+
- **样式**: Tailwind CSS 3+ + Headless UI
- **动画**: Framer Motion
- **状态管理**: Zustand + TanStack Query
- **UI组件**: Radix UI + Custom Components
- **测试**: Jest + React Testing Library + Enhanced Testing Framework

### 后端技术栈
- **运行时**: Node.js 18+ (LTS)
- **API**: Next.js API Routes + Express.js (微服务阶段)
- **数据库**: PostgreSQL 15+ + Prisma ORM
- **缓存**: Redis 7+
- **认证**: NextAuth.js + Supabase Auth
- **文件存储**: AWS S3 + Cloudflare R2

### 基础设施
- **部署平台**: Vercel (前端) + AWS EKS (后端)
- **监控**: Prometheus + Grafana + Sentry + DataDog
- **CI/CD**: GitHub Actions + ArgoCD
- **容器化**: Docker + Kubernetes

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
- **导入顺序**: 第三方库 → 内部模块 → 相对路径

### Architecture Patterns

#### 微服务架构演进
```
阶段1 (MVP): 单体应用 (Next.js Full-Stack)
阶段2 (Growth): 服务分离 (前端 + API Gateway + 业务服务)
阶段3 (Scale): 微服务架构 (独立部署的微服务集群)
```

#### 组件架构分层
- **页面组件**: 完整的页面实现
- **布局组件**: 页面布局和结构
- **区块组件**: 页面功能区块
- **业务组件**: 特定业务逻辑组件
- **UI组件**: 基础UI组件

### Testing Strategy

#### 测试金字塔
- **单元测试**: 覆盖率 ≥ 80%，测试核心业务逻辑
- **集成测试**: 覆盖率 ≥ 60%，验证服务间通信
- **E2E测试**: 覆盖核心用户流程

#### 测试文件命名
- `Button.test.tsx` - 组件测试
- `userService.test.ts` - 服务测试
- `api.test.ts` - API测试
- `auth.e2e.spec.ts` - E2E测试

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
- **用户**: 创作者、客户、管理员
- **方案**: 无人机设计解决方案
- **产品**: 经过认证的无人机核心套件
- **订单**: 购买记录和交易信息
- **认证**: 性能验证和质量标准

### 业务流程
1. **创作者提交方案** → **平台审核验证** → **生产销售** → **利润分成**
2. **客户浏览产品** → **下单购买** → **获取套件** → **组装使用**

### 认证标准
- 超过50项实验室和外场测试
- 性能验证报告和安全可靠性保证
- "OpenAero Certified"品牌标准

## Important Constraints

### 技术约束
- **阶段驱动开发**: 必须严格遵循DEVELOPMENT_PHASES.md中的开发阶段顺序
- **微服务演进**: 从单体应用平滑过渡到微服务架构
- **国际化支持**: 支持多语言和多地区部署
- **移动端适配**: 响应式设计，未来支持PWA

### 业务约束
- **创作者利润分成**: 固定50%利润分成模式
- **认证标准**: 严格的性能验证和质量保证
- **供应链合作**: 与T-Motor、CUAV、Holybro等顶级供应商合作
- **合规要求**: 符合中国ICP备案要求 (粤ICP备2020099654号-3)

### 安全约束
- **数据保护**: 敏感数据加密存储
- **HTTPS加密**: 全站SSL加密
- **速率限制**: 防止暴力攻击
- **权限控制**: 基于角色的访问控制

## External Dependencies

### 第三方服务
- **Supabase**: 初期数据库和认证服务
- **AWS**: 生产环境云服务 (S3, EKS, RDS)
- **Vercel**: 前端部署平台
- **Cloudflare**: CDN和安全防护
- **Sentry**: 错误监控
- **DataDog**: 基础设施监控

### API集成
- **支付网关**: 支持多种支付方式
- **邮件服务**: 用户通知和验证
- **短信服务**: 双因素认证
- **地图服务**: 位置相关功能
- **物流服务**: 订单配送跟踪

### 开发工具
- **GitHub**: 代码托管和CI/CD
- **Docker**: 容器化部署
- **Kubernetes**: 容器编排
- **Prometheus**: 监控系统
- **Grafana**: 数据可视化

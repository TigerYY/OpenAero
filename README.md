# 开元空御 - 社区驱动的开放式无人机解决方案平台

**版本**: 2.0.0  
**最后更新**: 2025-01-25  
**状态**: 🟢 活跃开发  
**维护者**: OpenAero 开发团队  
**目的**: 连接全球无人机创作者与专业客户的开放式平台

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Website](https://img.shields.io/badge/website-openaero.cn-green.svg)](https://openaero.cn)
[![ICP](https://img.shields.io/badge/ICP-粤ICP备2020099654号--3-red.svg)](https://beian.miit.gov.cn/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/TigerYY/OpenAero/actions)
[![Code Quality](https://img.shields.io/badge/code%20quality-A-brightgreen.svg)](https://github.com/TigerYY/OpenAero)

## 概述

开元空御是一个社区驱动的开放式无人机解决方案平台，连接全球无人机创作者与专业客户。我们致力于将优秀的无人机创新设计进行专业验证、生产和销售，为创作者提供50%的利润分成，为客户提供经过认证的高性能无人机核心套件。

## ✨ 核心特性

- **🎯 双端价值主张**: 同时服务创作者和客户
- **🔍 解决方案市场**: 展示经过认证的无人机核心套件
- **👨‍💻 创作者中心**: 提供完整的商业化支持
- **✅ 认证标准**: 严格的性能验证和质量保证
- **🤝 生态伙伴**: 与供应链顶尖伙伴深度合作
- **📚 开发者中心**: 提供技术文档和开发支持
- **🚀 微服务架构**: 可扩展的现代化技术架构
- **📊 智能监控**: 全方位的性能监控和运维体系

## 🌐 在线访问

- **官方网站**: [https://openaero.cn](https://openaero.cn)
- **备案信息**: 粤ICP备2020099654号-3

## 🏗️ 技术架构

### 前端技术栈
- **框架**: Next.js 14+ (App Router)
- **语言**: TypeScript 5+
- **样式**: Tailwind CSS 3+ + Headless UI
- **动画**: Framer Motion
- **状态管理**: Zustand + TanStack Query
- **UI组件**: Radix UI + Custom Components
- **测试**: Jest + React Testing Library + Enhanced Testing Framework
- **监控**: Sentry + Web Vitals + Custom Quality Metrics

### 后端技术栈
- **运行时**: Node.js 18+ (LTS)
- **API**: Next.js API Routes + Express.js (微服务)
- **数据库**: PostgreSQL 15+ + Prisma ORM
- **缓存**: Redis 7+
- **消息队列**: RabbitMQ / Apache Kafka
- **文件存储**: AWS S3 + Cloudflare R2
- **认证**: NextAuth.js + Supabase Auth

### 微服务架构
- **API网关**: Kong / AWS API Gateway
- **服务发现**: Consul / Kubernetes Service Discovery
- **配置管理**: Kubernetes ConfigMaps + Consul
- **监控**: Prometheus + Grafana + Jaeger
- **日志**: ELK Stack (Elasticsearch + Logstash + Kibana)

### 部署与运维
- **容器化**: Docker + Kubernetes
- **CI/CD**: GitHub Actions + ArgoCD
- **部署平台**: Vercel (前端) + AWS EKS (后端)
- **CDN**: Cloudflare
- **监控**: DataDog + Sentry + PagerDuty
- **安全**: Let's Encrypt + WAF + DDoS Protection

## 📁 项目结构

```
openaero.web/
├── .github/                    # GitHub配置
│   ├── workflows/             # CI/CD流程
│   ├── ISSUE_TEMPLATE/        # Issue模板
│   └── PULL_REQUEST_TEMPLATE/ # PR模板
├── .vscode/                   # VSCode配置
├── docs/                      # 项目文档
│   ├── architecture/          # 架构文档
│   ├── development/           # 开发文档
│   ├── deployment/            # 部署文档
│   └── api/                   # API文档
├── src/                       # 源代码
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/           # 认证相关页面
│   │   ├── (dashboard)/      # 仪表盘页面
│   │   ├── (marketing)/      # 营销页面
│   │   ├── api/              # API路由
│   │   ├── globals.css       # 全局样式
│   │   └── layout.tsx        # 根布局
│   ├── components/            # 组件库
│   │   ├── ui/               # 基础UI组件
│   │   ├── layout/           # 布局组件
│   │   ├── business/         # 业务组件
│   │   └── forms/            # 表单组件
│   ├── lib/                  # 工具库
│   │   ├── auth.ts           # 认证工具
│   │   ├── db.ts             # 数据库连接
│   │   ├── utils.ts          # 通用工具
│   │   ├── validations.ts    # 数据验证
│   │   └── constants.ts      # 常量定义
│   ├── hooks/                # 自定义Hooks
│   ├── stores/               # 状态管理
│   ├── types/                # TypeScript类型
│   └── styles/               # 样式文件
├── prisma/                   # 数据库模式
├── public/                   # 静态资源
├── tests/                    # 测试文件
│   ├── unit/                 # 单元测试
│   ├── integration/          # 集成测试
│   └── e2e/                  # 端到端测试
├── scripts/                  # 脚本文件
├── k8s/                      # Kubernetes配置
├── .env.example              # 环境变量示例
├── .gitignore               # Git忽略文件
├── .eslintrc.json           # ESLint配置
├── .prettierrc              # Prettier配置
├── next.config.js           # Next.js配置
├── tailwind.config.js       # Tailwind配置
├── tsconfig.json            # TypeScript配置
├── package.json             # 依赖管理
└── README.md                # 项目说明
```

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn
- Git

### 本地开发
```bash
# 克隆项目
git clone https://github.com/your-username/openaero.web.git

# 进入项目目录
cd openaero.web

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

### 部署到服务器
```bash
# 配置服务器环境
./setup-server.sh

# 部署网站
./deploy.sh
```

## 📋 功能模块

### 1. 解决方案市场
- 展示所有经过认证的无人机核心套件
- 支持多维度筛选和排序
- 详细的产品信息和技术规格
- 公开的BOM清单和透明定价

### 2. 创作者中心
- 50%利润分成的创作者计划
- 从方案提交到收益获取的完整流程
- 专业验证和生产支持
- 全球渠道销售

### 3. 认证标准
- 超过50项实验室和外场测试
- 性能验证报告
- 安全性和可靠性保证
- "OpenAero Certified"品牌标准

### 4. 生态伙伴
- 与T-Motor、CUAV、Holybro等顶级供应商合作
- 共赢的开放生态模式
- 优质产品集成

### 5. 开发者中心
- 详尽的技术文档
- 二次开发指南
- 社区支持
- SDK和工具下载

## 🔧 开发指南

### 组件开发
项目采用分层组件架构：
- **页面组件**: 完整的页面实现
- **布局组件**: 页面布局和结构
- **区块组件**: 页面功能区块
- **业务组件**: 特定业务逻辑组件
- **UI组件**: 基础UI组件

### 样式规范
- 使用 Tailwind CSS 进行样式开发
- 遵循响应式设计原则
- 保持设计系统的一致性

### 代码规范
- 使用 TypeScript 进行类型检查
- 遵循 ESLint 和 Prettier 规范
- 编写清晰的注释和文档

## 📊 性能优化

- **静态生成**: 使用 Next.js SSG 预渲染页面
- **图片优化**: 自动优化和懒加载
- **代码分割**: 按需加载组件
- **CDN加速**: 使用 Cloudflare CDN
- **缓存策略**: 多层缓存优化

## 🔒 安全措施

- **HTTPS**: 全站SSL加密
- **安全头**: 配置完整的安全头
- **输入验证**: 服务端数据验证
- **速率限制**: 防止暴力攻击
- **数据保护**: 敏感数据加密存储

## 📈 项目状态

### 已完成
- ✅ 产品需求文档 (PRD V2.0)
- ✅ 技术架构设计
- ✅ 微服务架构设计
- ✅ 开发规范制定
- ✅ 监控运维体系设计
- ✅ 部署策略制定
- ✅ 网站主页面开发
- ✅ 响应式设计实现
- ✅ ICP备案信息配置
- ✅ 增强测试框架集成
- ✅ 质量监控系统实现
- ✅ CI/CD 质量门禁配置

### 进行中
- 🚧 Next.js应用开发
- 🚧 微服务架构实现
- 🚧 数据库集成
- 🚧 API接口开发

### 计划中
- ⏳ 创作者管理系统
- ⏳ 内容管理系统
- ⏳ 支付系统集成
- ⏳ 移动端应用开发
- ⏳ 国际化支持

## 📚 文档导航

> **📖 [完整文档索引](./DOCS_INDEX.md)** - 查看所有文档的详细导航和说明

### 核心文档
- **[产品需求文档 (PRD V2.0)](./PRDV2.md)** - 完整的产品规划和需求定义
- **[技术框架与开发规范](./tech-framework-standards.md)** - 技术架构和开发标准
- **[微服务架构设计](./microservices-architecture.md)** - 微服务架构和演进策略
- **[开发工作流与代码规范](./development-workflow.md)** - 开发流程和代码标准
- **[监控与运维体系](./monitoring-operations.md)** - 监控、日志和运维方案
- **[部署与发布策略](./deployment-strategy.md)** - 部署流程和发布管理
- **[规范执行保障方案](./standards-enforcement.md)** - 确保规范正确执行的保障机制
- **[监控系统文档](./MONITORING.md)** - 质量监控和性能指标系统
- **[测试框架文档](./TESTING.md)** - 增强测试框架和最佳实践
- **[贡献指南](./CONTRIBUTING.md)** - 代码贡献和开发流程指南

### 技术文档
- **[组件设计方案](./component-design.md)** - UI组件和页面设计
- **[架构图表](./architecture-diagrams.md)** - 系统架构可视化

### 项目状态
- **[部署状态报告](./deployment-status.md)** - 当前部署状态和问题

## 🤝 贡献指南

我们欢迎社区贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 开发规范
请确保遵循项目的开发规范：
- **[贡献指南](./CONTRIBUTING.md)** - 完整的代码贡献流程
- **[测试框架](./TESTING.md)** - 测试标准和最佳实践
- **[监控系统](./MONITORING.md)** - 质量监控和性能指标
- 代码风格和命名规范
- 提交信息格式
- 测试覆盖率要求 (>80%)
- 代码审查流程

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系我们

- **邮箱**: contact@openaero.cn
- **网站**: [https://openaero.cn](https://openaero.cn)
- **备案**: 粤ICP备2020099654号-3

## 🙏 致谢

感谢所有为 OpenAero 项目做出贡献的开发者和社区成员！

---

**OpenAero** - 让每一个伟大的无人机创意都能轻松地变为可靠的产品，并走向全球。

# OpenAero Web Platform Constitution

<!--
Sync Impact Report v1.0.0:
Version change: initial → 1.0.0
Modified principles:
- All principles newly defined
Added sections:
- Core Principles
- Quality Standards
- Development Workflow
- Governance
Templates requiring updates:
✅ .specify/templates/plan-template.md
✅ .specify/templates/spec-template.md
✅ .specify/templates/tasks-template.md
-->

## Core Principles

### I. User-Centric Bilingual Experience
所有功能必须同时支持中文和英文用户体验。界面文案必须经过本地化，保持专业性和语言表达准确性。早期采用最小可行的国际化方案，为未来扩展留下空间。
- 所有用户界面文本必须通过 `messages/{locale}.json` 管理
- 默认使用中文（zh），但保证英文（en）体验完整
- 遵循 Next.js 约定的路由策略（/en 前缀）

### II. Community-Driven Development
平台功能必须响应社区需求，同时保持代码质量和可维护性。新功能开发必须经过明确的规范文档（Spec）和技术方案（Plan）阶段。
- 所有重要功能变更必须有对应的 `/specs/<feature>/spec.md`
- 技术方案必须考虑可扩展性和长期维护成本
- 功能发布前必须完成文档和测试

### III. Performance First
性能是用户体验的核心。页面必须快速加载，交互必须流畅，资源使用必须高效。
- 首次内容绘制（FCP）必须 < 1.5s
- 最大内容绘制（LCP）必须 < 2.5s
- 累积布局偏移（CLS）必须 < 0.1
- 首次输入延迟（FID）必须 < 100ms

### IV. Observable & Maintainable
系统的每个部分都必须可观测、可调试。错误必须可追踪，性能数据必须可度量。
- 使用结构化日志记录关键操作
- 实现全链路追踪（Jaeger/OpenTelemetry）
- 保持清晰的错误边界和恢复机制
- 监控覆盖所有关键业务指标

### V. Security & Compliance
安全性和合规性不可妥协。必须保护用户数据，遵守相关法规，预防各类安全威胁。
- 实施安全标头（CSP, HSTS等）
- 所有用户输入必须经过验证和清洗
- 遵守数据保护规范
- 定期进行安全审计和更新

## Quality Standards

### 代码质量
- 统一代码风格（ESLint + Prettier）
- TypeScript 严格模式
- 组件必须有单元测试
- PR 必须通过 CI 检查

### 性能标准
- 打包体积限制：
  - 首页 JavaScript < 150KB（gzip）
  - 单页面 JavaScript < 200KB（gzip）
- 服务端响应时间 < 200ms（P95）
- 静态资源必须使用 CDN
- 实现适当的缓存策略

### 可访问性
- 符合 WCAG 2.1 AA 标准
- 支持键盘导航
- 提供适当的 ARIA 标签
- 确保足够的颜色对比度

## Development Workflow

### 分支策略
- main: 生产环境代码
- develop: 开发集成分支
- feature/*: 功能开发分支
- hotfix/*: 紧急修复分支

### 提交规范
- 使用语义化提交信息
- 变更必须关联 Issue/规范
- 大型变更必须提供迁移指南

### 代码审查
- 至少一名审查者批准
- 必须包含测试覆盖
- 确保性能无显著退化
- 验证国际化文案完整性

## Governance

项目治理遵循以下规则：
1. 本宪章是项目开发的最高指导文件
2. 重大变更必须经过技术委员会批准
3. 性能或安全退化必须立即解决
4. 定期进行合规性审计

**修订流程**:
1. 提出修订建议（Issue）
2. 讨论并收集反馈（7天）
3. 技术委员会投票
4. 更新文档并执行迁移

**版本控制**:
- MAJOR: 破坏性原则变更
- MINOR: 新增原则或标准
- PATCH: 澄清或改进现有内容

**Version**: 1.0.0 | **Ratified**: 2025-10-23 | **Last Amended**: 2025-10-23

<!--
Sync Impact Report:
- Version change: 1.0.0 → 1.1.0
- Modified principles: All principles updated to reflect OpenAero project specifics
- Added sections: Development Workflow, Technology Standards
- Removed sections: None
- Templates requiring updates:
  - ✅ plan-template.md (Constitution Check section needs alignment)
  - ✅ spec-template.md (Requirements alignment)
  - ✅ tasks-template.md (Task categorization alignment)
  - ⚠️ Follow-up: Check command templates if they exist
- TODOs: None - all placeholders resolved
-->

# OpenAero Constitution

## Core Principles

### I. Phase-Driven Development (NON-NEGOTIABLE)
所有开发工作必须严格遵循既定的开发阶段顺序。AI助理在开发前必须先查看DEVELOPMENT_PHASES.md文件，确保不会打乱开发顺序。

**Rationale**: 确保项目按计划有序推进，避免功能冲突和资源浪费。

### II. Test-First Development
TDD强制要求：测试编写 → 用户批准 → 测试失败 → 然后实现。严格强制执行红-绿-重构循环。

**Rationale**: 确保代码质量和功能正确性，减少回归错误。

### III. Microservices Architecture
采用微服务架构，每个服务独立部署、独立扩展。API网关统一管理服务发现和负载均衡。

**Rationale**: 提高系统可扩展性和维护性，支持团队并行开发。

### IV. Quality Monitoring
集成完整的监控运维体系，包括Prometheus + Grafana监控、ELK日志管理、Sentry错误追踪。

**Rationale**: 确保生产环境稳定运行，快速定位和解决问题。

### V. Security-First Approach
全站HTTPS加密，配置完整的安全头，服务端数据验证，速率限制防止暴力攻击。

**Rationale**: 保护用户数据和系统安全，符合行业安全标准。

## Technology Standards

### Frontend Stack
- **框架**: Next.js 14+ (App Router)
- **语言**: TypeScript 5+
- **样式**: Tailwind CSS 3+ + Headless UI
- **状态管理**: Zustand + TanStack Query
- **测试**: Jest + React Testing Library

### Backend Stack  
- **运行时**: Node.js 18+ (LTS)
- **数据库**: PostgreSQL 15+ + Prisma ORM
- **缓存**: Redis 7+
- **认证**: NextAuth.js + Supabase Auth

### Deployment Standards
- **容器化**: Docker + Kubernetes
- **CI/CD**: GitHub Actions + ArgoCD
- **部署平台**: Vercel (前端) + AWS EKS (后端)
- **监控**: 多层监控体系

## Development Workflow

### Phase Management
- 严格按阶段顺序开发：Phase 1 → 2 → 3 → 4 → 5 → 6 → 7
- 开始新阶段前必须确认前置条件已满足
- 每完成一个阶段必须更新DEVELOPMENT_PHASES.md文件状态
- 禁止跳过阶段或打乱顺序

### Code Quality
- 代码覆盖率要求 >80%
- 遵循ESLint和Prettier规范
- 编写清晰的注释和文档
- 代码审查流程强制执行

### Testing Strategy
- 单元测试：覆盖核心业务逻辑
- 集成测试：验证服务间通信
- E2E测试：完整用户流程验证
- 性能测试：确保系统响应性能

## Governance

宪法优先于所有其他实践。修订需要文档记录、批准和迁移计划。

所有PR/审查必须验证合规性。复杂性必须得到合理解释。使用DEVELOPMENT_PHASES.md进行运行时开发指导。

**Amendment Procedure**: 
- 重大变更需要团队讨论和批准
- 版本更新遵循语义化版本控制
- 所有变更必须记录在宪法文件中

**Compliance Review**:
- 定期审查宪法执行情况
- 确保所有开发活动符合宪法要求
- 及时更新过时的实践和标准

**Version**: 1.1.0 | **Ratified**: 2024-12-01 | **Last Amended**: 2025-11-02

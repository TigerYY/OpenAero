<!-- OPENSPEC:START -->

# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:

- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big
  performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:

- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# Repository Guidelines

## Project Structure & Module Organization

- `src/app` hosts Next.js route handlers and layout composition; shared UI sits
  in `src/components`, reusable logic in `src/lib`, and typed contracts under
  `src/types`.
- API specifications and fixtures live in `specs/`, while database models and
  migrations are in `prisma/`.
- Test suites mirror production code in `tests/` (API, components, e2e); static
  assets and SEO artifacts are kept in `public/`.
- Operational assets such as Kubernetes manifests (`k8s/`), monitoring playbooks
  (`monitoring/`), and helper scripts (`scripts/`) stay isolated to keep
  deployments reproducible.

## Build, Test, and Development Commands

```bash
npm run dev          # start the local Next.js server with port cleanup
npm run build        # compile production assets
npm run start        # serve the built app
npm run lint         # run ESLint with the Next.js config
npm run type-check   # verify TypeScript types
npm run test:coverage  # execute Jest unit/integration suite with coverage
npm run test:e2e     # run Playwright end-to-end scenarios
npm run quality:check  # lint + type-check + Jest coverage gate

# 数据库操作命令
npm run db:generate  # 生成 Prisma 客户端
npm run db:push      # 推送数据库变更
npm run db:migrate   # 运行数据库迁移
npm run db:reset     # 重置数据库（开发环境）
npm run db:status    # 查看数据库状态

# 测试运行命令
npm test -- tests/path/to/test-file.test.tsx  # 运行单个测试文件
npm test -- --testNamePattern="组件名称"       # 运行特定测试套件
npm run test:debug                            # 调试模式运行测试
npm test -- -u                                # 更新测试快照
```

## Coding Style & Naming Conventions

- TypeScript is required; keep modules typed and prefer `zod` schemas for
  runtime validation.
- Prettier enforces 2-space indentation, 80-character wrapping, single quotes,
  and trailing commas.
- ESLint (`next/core-web-vitals`, `@typescript-eslint`, `import/order`) must
  pass; honor camelCase for variables/functions and PascalCase for components,
  hooks, and types.
- Use CSS-in-JS via Tailwind utilities; co-locate component styles with their
  `.tsx` sources.

## Testing Guidelines

- Jest runs in JSDOM with setup from `jest.setup.ts` and `tests/setup/`;
  structure tests alongside features using `*.test.ts(x)` or `*.spec.ts(x)`
  naming.
- Maintain ≥70% coverage across branches, functions, lines, and statements as
  enforced by `jest.config.js`.
- Prefer Testing Library for React units and Playwright for user flows in
  `tests/e2e`; update fixtures when modifying API contracts.
- Include `npm run test:all` (coverage + e2e) before merging substantial feature
  work.

## Commit & Pull Request Guidelines

- Follow concise, imperative messages; conventional prefixes (`feat:`, `fix:`,
  `chore:`) are encouraged, but clarity takes precedence over strict format.
- Group related changes per commit and reference ticket IDs when available;
  mixed-language summaries are acceptable if the first line is descriptive.
- Pull requests should describe scope, list key commands/tests executed, and
  attach UI screenshots or API samples when the change affects behavior.

## Security & Configuration Tips

- Copy secrets from `env.example` into a personal `.env.local`; never commit
  real credentials.
- Run `npm run validate:i18n` after editing locale files and
  `npm run db:generate` whenever `prisma/schema.prisma` changes to keep clients
  in sync.

## 开发阶段管理

- 所有开发工作必须严格遵循 [DEVELOPMENT_PHASES.md](./DEVELOPMENT_PHASES.md)
  中定义的阶段顺序
- 当前处于阶段 5：平台业务闭环实现
- 在开始任何开发前，先检查阶段锁定文件

## 质量门禁流程

1. 代码提交前必须通过 `npm run quality:check`
2. 测试覆盖率必须 ≥70%
3. 所有 API 变更需要更新对应的 spec 文件
4. 数据库变更需要生成对应的迁移文件
5. 部署前需要运行完整的端到端测试

## 微服务架构关键组件

- **API Gateway**: 处理所有外部请求路由
- **用户服务**: 用户认证和权限管理
- **产品服务**: 无人机解决方案管理
- **订单服务**: 交易和支付处理
- **通知服务**: 消息和邮件通知
- **文件服务**: 文件上传和存储管理

## 部署和发布

- 生产环境部署使用蓝绿部署策略
- 所有部署必须通过 CI/CD 流水线
- 部署后需要验证监控指标正常
- 回滚流程必须预先测试

## Recent Changes

- 005-platform-business-loop: Added [if applicable, e.g., PostgreSQL, CoreData,
  files or N/A]

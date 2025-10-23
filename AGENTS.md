# Repository Guidelines

## Project Structure & Module Organization
- `src/app` hosts Next.js route handlers and layout composition; shared UI sits in `src/components`, reusable logic in `src/lib`, and typed contracts under `src/types`.
- API specifications and fixtures live in `specs/`, while database models and migrations are in `prisma/`.
- Test suites mirror production code in `tests/` (API, components, e2e); static assets and SEO artifacts are kept in `public/`.
- Operational assets such as Kubernetes manifests (`k8s/`), monitoring playbooks (`monitoring/`), and helper scripts (`scripts/`) stay isolated to keep deployments reproducible.

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
```

## Coding Style & Naming Conventions
- TypeScript is required; keep modules typed and prefer `zod` schemas for runtime validation.
- Prettier enforces 2-space indentation, 80-character wrapping, single quotes, and trailing commas.
- ESLint (`next/core-web-vitals`, `@typescript-eslint`, `import/order`) must pass; honor camelCase for variables/functions and PascalCase for components, hooks, and types.
- Use CSS-in-JS via Tailwind utilities; co-locate component styles with their `.tsx` sources.

## Testing Guidelines
- Jest runs in JSDOM with setup from `jest.setup.ts` and `tests/setup/`; structure tests alongside features using `*.test.ts(x)` or `*.spec.ts(x)` naming.
- Maintain ≥70% coverage across branches, functions, lines, and statements as enforced by `jest.config.js`.
- Prefer Testing Library for React units and Playwright for user flows in `tests/e2e`; update fixtures when modifying API contracts.
- Include `npm run test:all` (coverage + e2e) before merging substantial feature work.

## Commit & Pull Request Guidelines
- Follow concise, imperative messages; conventional prefixes (`feat:`, `fix:`, `chore:`) are encouraged, but clarity takes precedence over strict format.
- Group related changes per commit and reference ticket IDs when available; mixed-language summaries are acceptable if the first line is descriptive.
- Pull requests should describe scope, list key commands/tests executed, and attach UI screenshots or API samples when the change affects behavior.

## Security & Configuration Tips
- Copy secrets from `env.example` into a personal `.env.local`; never commit real credentials.
- Run `npm run validate:i18n` after editing locale files and `npm run db:generate` whenever `prisma/schema.prisma` changes to keep clients in sync.

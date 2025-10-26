# Tasks: 国际化（i18n）规格 — 早期双语策略

**Input**: Design documents from `/specs/internationalization/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Organization**: Tasks are grouped by implementation phase to enable systematic development and testing.

## Format: `[ID] [P?] [Phase] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Phase]**: Which implementation phase this task belongs to
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: Next.js project structure
- **Messages**: `messages/{locale}.json`
- **Components**: `src/components/`
- **Utils**: `src/lib/`

---

## Phase 0: 环境验证 (已完成)

**Purpose**: 确认现有 i18n 基础设施状态

- [x] T001 验证 Next.js i18n 配置已启用 (`next.config.js`)
- [x] T002 确认 `src/i18n.ts` 配置文件存在且正确
- [x] T003 检查 `messages/` 目录结构和现有文件

---

## Phase 1: 翻译文件完善

**Purpose**: 创建完整的双语翻译文件

**⚠️ CRITICAL**: 必须完成此阶段才能进行用户界面开发

- [ ] T004 审核现有 `messages/zh.json` 文件内容和结构
- [ ] T005 审核现有 `messages/en.json` 文件内容和结构
- [ ] T006 [P] 补充导航菜单翻译 (`nav.home`, `nav.solutions`, `nav.creators`)
- [ ] T007 [P] 补充首页内容翻译 (`home.title`, `home.subtitle`, `home.description`)
- [ ] T008 [P] 补充通用错误信息翻译 (`error.generic`, `error.network`, `error.validation`)
- [ ] T009 [P] 补充表单标签翻译 (`form.submit`, `form.cancel`, `form.required`)
- [ ] T010 建立翻译 key 命名约定文档
- [ ] T011 [P] 创建翻译类型定义文件 `messages/index.ts` (可选)
- [ ] T012 验证两个语言文件的 key 结构一致性

**Checkpoint**: 翻译文件完整 - 可以开始 UI 组件开发

---

## Phase 2: 语言切换功能

**Purpose**: 实现用户界面的语言切换机制

### 用户故事 1: 语言切换组件 (Priority: P1) 🎯 MVP

**Goal**: 用户可以在界面上切换语言

**Independent Test**: 点击语言切换器，页面语言和 URL 正确更新

- [ ] T013 创建 `LanguageSwitcher` 组件 (`src/components/LanguageSwitcher.tsx`)
- [ ] T014 实现语言选择 UI (下拉菜单或按钮组)
- [ ] T015 实现路由切换逻辑 (`/` ↔ `/en`)
- [ ] T016 添加当前语言状态指示
- [ ] T017 处理语言切换时的页面状态保持

### 用户故事 2: 导航集成 (Priority: P1) 🎯 MVP

**Goal**: 语言切换器集成到主导航中

**Independent Test**: 在任何页面都能看到并使用语言切换功能

- [ ] T018 将 `LanguageSwitcher` 集成到主导航组件
- [ ] T019 [P] 调整导航布局以适应语言切换器
- [ ] T020 [P] 确保移动端响应式设计正确
- [ ] T021 添加语言切换的无障碍支持 (ARIA 标签)

### 用户故事 3: 页面内容本地化 (Priority: P2)

**Goal**: 所有页面内容正确显示对应语言

**Independent Test**: 切换语言后，页面所有文本都更新为对应语言

- [ ] T022 更新首页组件使用 `useTranslations` hook
- [ ] T023 [P] 更新导航组件使用翻译 key
- [ ] T024 [P] 更新页脚组件使用翻译 key
- [ ] T025 [P] 更新错误页面使用翻译 key
- [ ] T026 处理动态内容的本地化 (如日期、数字格式)

---

## Phase 3: 测试与验证

**Purpose**: 确保 i18n 功能稳定可靠

### 用户故事 4: 自动化测试 (Priority: P2)

**Goal**: 完整的测试覆盖确保功能稳定

**Independent Test**: 所有测试通过，覆盖率达标

- [ ] T027 编写翻译文件加载单元测试 (`tests/lib/i18n.test.ts`)
- [ ] T028 [P] 编写 `LanguageSwitcher` 组件单元测试
- [ ] T029 [P] 编写翻译 key 完整性验证测试
- [ ] T030 编写语言切换 E2E 测试 (`tests/e2e/i18n.spec.ts`)
- [ ] T031 [P] 编写路由切换 E2E 测试
- [ ] T032 [P] 编写性能测试 (翻译加载时间)

### 用户故事 5: 错误处理 (Priority: P3)

**Goal**: 优雅处理翻译相关错误

**Independent Test**: 缺失翻译或错误配置时系统仍能正常运行

- [ ] T033 实现缺失翻译 key 的 fallback 机制
- [ ] T034 [P] 添加翻译加载失败的错误处理
- [ ] T035 [P] 实现开发环境的翻译调试工具
- [ ] T036 添加翻译错误的监控和日志记录

---

## Phase 4: 文档与维护

**Purpose**: 完善文档和维护流程

### 用户故事 6: 开发者文档 (Priority: P3)

**Goal**: 开发者可以轻松维护和扩展 i18n 功能

**Independent Test**: 新开发者能根据文档成功添加新翻译

- [ ] T037 更新 README 添加 i18n 使用说明
- [ ] T038 [P] 创建翻译贡献指南 (`DOCS/TRANSLATION_GUIDE.md`)
- [ ] T039 [P] 创建 i18n 最佳实践文档
- [ ] T040 添加翻译 key 命名规范到项目标准

### 用户故事 7: 自动化工具 (Priority: P3)

**Goal**: 自动化验证和维护翻译文件

**Independent Test**: 脚本能自动检测翻译问题并提供修复建议

- [ ] T041 创建翻译文件验证脚本 (`scripts/validate-translations.js`)
- [ ] T042 [P] 添加翻译 key 同步检查到 CI/CD
- [ ] T043 [P] 创建翻译统计和报告工具
- [ ] T044 设置开发环境的翻译检查 hook

---

## 验收标准

### 功能验收
- [ ] 支持 zh/en 双语无缝切换
- [ ] 所有 UI 文本都有对应翻译
- [ ] 语言切换响应时间 <200ms
- [ ] URL 路由正确反映当前语言

### 质量验收
- [ ] 测试覆盖率 >80%
- [ ] 零 i18n 相关运行时错误
- [ ] 代码审查通过
- [ ] 性能指标达标

### 用户体验验收
- [ ] 语言切换操作直观易用
- [ ] 移动端体验良好
- [ ] 无障碍功能完整
- [ ] 翻译内容准确自然

---

## 风险缓解任务

### 高风险缓解
- [ ] T045 测试现有路由与 i18n 路由的兼容性
- [ ] T046 创建路由冲突检测和修复方案

### 中风险缓解
- [ ] T047 建立翻译质量审核流程
- [ ] T048 设置用户反馈收集机制

### 低风险缓解
- [ ] T049 实施翻译文件缓存策略
- [ ] T050 监控 i18n 功能的性能影响

---

**总任务数**: 50 个任务
**预计工期**: 3-5 个工作日
**关键路径**: Phase 1 → Phase 2 (US1-US2) → Phase 3 (US4)
**并行开发**: Phase 2 的多个用户故事可以并行开发
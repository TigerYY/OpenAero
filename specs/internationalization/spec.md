# 国际化（i18n）规格 — 早期双语策略 (zh / en)

目标

- 在项目初期以最小可行复杂度（MVP）支持中文（zh）和英文（en）。
- 保持对将来添加更多语言的可扩展性。
- 使用现有依赖（next-intl）与 Next.js 的 i18n 路由功能做最小改动实现。 

范围

- 仅覆盖 UI 文本（页面、组件、导航、表单标签、错误提示）。
- 不包括内容翻译工作流（市场/文档翻译管理系统）——但提供文件/命名约定便于未来迁移。

策略要点（高层）

- 语言列表：`zh`, `en`。
- 默认语言：`zh`。
- 路由策略：启用 Next.js 的 locale 前缀路由（例如 `/en/...`），默认 `zh` 页面保留无前缀（可根据未来需求改动）。
- 不启用自动 locale 检测（localeDetection: false）以减少早期复杂性与 SEO 干扰。
- 文案存放：每种语言一个 JSON 文件，目录为 `messages/{locale}.json`（项目已存在 `messages` 目录）。
- 运行时加载：使用 `next-intl` 的服务器端 `getRequestConfig`（项目已有 `src/i18n.ts`），按需加载对应语言的 JSON。

契约（Contract）

- 输入：Next.js 请求（含 locale 前缀或 Accept-Language 但目前不检测）。
- 输出：页面渲染时，提供一个 `messages` 对象到 `next-intl` hook/组件用于本地化字符串。
- 错误模式：找不到翻译 key 时，先在控制台打印警告，页面显示 key 本身或英文 fallback（可配置）。
- 成功标准：页面在 `zh` 与 `en` 两种语言下均可正常渲染，且路由切换（/ -> /en）可工作。

实现步骤（MVP）

1. 启用 Next.js 的 `i18n` 配置（已实现）。
2. 确认 `src/i18n.ts` 按 locale 动态加载 `messages/{locale}.json`（已有实现）。
3. 检查 `messages/zh.json` 与 `messages/en.json` 是否存在并包含基础文本（如导航、首页标题、常见组件的 key）。如果不存在，创建最小集。示例 keys：
   - nav.home, nav.solutions, nav.creators
   - home.title, home.subtitle
   - error.generic
4. 在页面布局组件添加语言切换控件（只需一个简单的下拉或链接组）。切换方法：使用 Next.js `locale` 路由链接（`Link` 的 `locale` 属性），或直接导航到 `/${locale}${pathname}`。
5. 添加一个小的运行时检查（dev-only），在页面加载时确认 `messages` 包含预期 key（可通过简单脚本或单元测试完成）。
6. 文档：添加 `DOCS/INTERNATIONALIZATION.md` 或本规范文件链接，说明如何添加/更新译文与命名约定。

文件组织建议

- messages/
  - zh.json
  - en.json
- src/i18n.ts (已有)
- components/LanguageSwitcher.tsx （新）
- specs/internationalization/spec.md（当前文件）
- DOCS/TRANSLATION_GUIDE.md（可选，后续）

命名与维护约定

- 使用扁平或分组的 key（推荐分组）：`componentName.key` 或 `page.section.key`。
- 对于占位符（interpolation）使用统一格式 `{name}`。
- 避免长句子重复，多使用参数化字符串以减少翻译量。

迁移与扩展路径

- 若未来需要自动语言检测、翻译平台集成（如 Crowdin、Phrase），将 messages 保持 JSON 格式以便导入/导出。
- 若需要内容多语言（博客、用户生成内容），单独为内容存储多语言字段或独立表（不在 messages 里）。

QA 与测试

- 单元测试：`messages` 文件加载测试（dev only），确认基础 keys 存在。
- E2E：测试 `/`（zh 默认）与 `/en` 页面渲染出不同文本（Playwright）。

风险与回退

- 风险：默认语言保留无前缀会导致将来迁移到全局 locale 前缀时需要大量重定向。缓解：在文档中明确说明并准备重定向策略。

里程碑（短期）

- Day 0：启用 `i18n`（已完成），校验 `src/i18n.ts`。
- Day 1：补齐 `messages/zh.json`、`messages/en.json`（基本导航与首页）。
- Day 2：实现 `LanguageSwitcher`、测试并写入规范文档。

附：示范 messages 简短示例

zh.json
{
  "nav": {"home": "首页", "solutions": "解决方案", "creators": "创作者"},
  "home": {"title": "欢迎来到 OpenAero", "subtitle": "开源无人机社区"},
  "error": {"generic": "发生错误，请稍后重试。"}
}

en.json
{
  "nav": {"home": "Home", "solutions": "Solutions", "creators": "Creators"},
  "home": {"title": "Welcome to OpenAero", "subtitle": "Open-source drone community"},
  "error": {"generic": "Something went wrong. Please try again later."}
}

---

Version: 0.1 — early-stage bilingual MVP

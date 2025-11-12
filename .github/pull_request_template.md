## 📝 PR 描述

<!-- 简要描述此 PR 的目的和变更内容 -->

## 🔗 相关 Issue

<!-- 关联相关的 Issue,例如: Closes #123 -->

## 🎯 变更类型

<!-- 请勾选适用的类型 -->

- [ ] 🐛 Bug 修复 (bug fix)
- [ ] ✨ 新功能 (new feature)
- [ ] 💄 UI/样式更新 (UI/style update)
- [ ] ♻️ 代码重构 (refactoring)
- [ ] 📝 文档更新 (documentation)
- [ ] 🔧 配置变更 (configuration)
- [ ] ⚡️ 性能优化 (performance)
- [ ] ✅ 测试相关 (tests)

## 📋 变更清单

<!-- 详细列出此 PR 的主要变更 -->

- 
- 
- 

## 🧪 测试

<!-- 描述测试方法和结果 -->

### 测试步骤
1. 
2. 
3. 

### 测试结果
- [ ] 本地测试通过
- [ ] 路由检查通过 (`npm run check:routes`)
- [ ] ESLint 检查通过 (`npm run lint`)
- [ ] TypeScript 检查通过 (`npm run type-check`)
- [ ] 单元测试通过 (`npm test`)

## 📸 截图 (如适用)

<!-- 添加截图或GIF来展示变更效果 -->

## 🛡️ 路由规范检查

<!-- 路由相关 PR 必须检查 -->

如果此 PR 涉及路由变更,请确认:

- [ ] ✅ 未使用硬编码路由 (运行 `npm run check:routes` 验证)
- [ ] ✅ 所有路由使用 `useRouting` hook
- [ ] ✅ Link 组件使用 `href={route(...)}`
- [ ] ✅ router.push 使用 `router.push(route(...))`

**自动检查**: GitHub Actions 会自动运行路由规范检查,请确保通过。

## ⚠️ 破坏性变更

<!-- 如果有破坏性变更,请详细说明 -->

- [ ] 此 PR 包含破坏性变更
- [ ] 已更新相关文档
- [ ] 已通知相关团队成员

## 📚 相关文档

<!-- 列出相关的文档链接 -->

- 

## 🔍 审查重点

<!-- 提醒审查者特别关注的部分 -->

- 
- 

## ✅ 检查清单

提交 PR 前请确认:

- [ ] 代码遵循项目编码规范
- [ ] 已添加/更新必要的文档
- [ ] 已添加/更新必要的测试
- [ ] 所有 CI 检查通过
- [ ] 已在本地测试所有变更
- [ ] PR 标题清晰且符合规范
- [ ] 已解决所有代码审查意见

---

## 💡 提示

- **路由检查**: 运行 `npm run check:routes` 检查路由规范
- **自动修复**: 运行 `npm run fix:routes` 自动修复路由问题
- **完整检查**: 运行 `npm run quality:check` 进行完整质量检查

感谢您的贡献! 🎉

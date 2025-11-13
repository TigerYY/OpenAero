# 路由系统规范变更

## MODIFIED Requirements

### Requirement: 统一路由生成
路由系统 SHALL 使用统一的路由工具库生成所有路由路径，支持国际化locale前缀。

#### Scenario: 组件中使用路由
- **WHEN** 组件需要生成路由链接
- **THEN** 使用 `useRouting()` hook 或 `RoutingUtils.route()` 方法
- **AND** 路由自动包含当前locale前缀（如 `/zh-CN/login`）

#### Scenario: API重定向使用路由
- **WHEN** API路由需要重定向到页面
- **THEN** 使用路由工具生成完整路径
- **AND** 路径包含正确的locale前缀

#### Scenario: 路由验证
- **WHEN** 生成路由路径
- **THEN** 路由工具验证路径格式
- **AND** 无效路径返回错误或警告

### Requirement: 路由结构一致性
项目 SHALL 使用统一的国际化路由结构，所有页面位于 `src/app/[locale]/` 目录下。

#### Scenario: 访问管理页面
- **WHEN** 用户访问管理功能
- **THEN** 路由为 `/[locale]/admin/*` 格式
- **AND** 不存在非国际化的 `/admin/*` 路由

#### Scenario: 路由目录结构
- **WHEN** 查看项目路由结构
- **THEN** 所有页面路由在 `[locale]` 目录下
- **AND** 不存在重复的路由目录

## ADDED Requirements

### Requirement: 路由工具库完整性
路由工具库 SHALL 提供完整的路由定义和生成功能。

#### Scenario: 获取认证路由
- **WHEN** 需要生成登录路由
- **THEN** 使用 `route(routes.AUTH.LOGIN)` 或 `route('/login')`
- **AND** 返回包含locale的完整路径

#### Scenario: 获取业务路由
- **WHEN** 需要生成业务页面路由
- **THEN** 使用 `route(routes.BUSINESS.SOLUTIONS)` 或 `route('/solutions')`
- **AND** 返回包含locale的完整路径

#### Scenario: 动态路由参数
- **WHEN** 需要生成带参数的路由（如 `/solutions/[id]`）
- **THEN** 使用 `route('/solutions/[id]', { id: '123' })`
- **AND** 返回包含参数和locale的完整路径

### Requirement: 路由检查工具
项目 SHALL 提供自动化工具检测硬编码路由。

#### Scenario: 运行路由检查
- **WHEN** 运行 `npm run check:routes`
- **THEN** 工具扫描所有文件
- **AND** 报告所有硬编码路由位置
- **AND** 提供修复建议

## REMOVED Requirements

### Requirement: 硬编码路由使用
**Reason**: 硬编码路由与国际化架构冲突，导致路由不匹配问题

**Migration**: 
- 所有硬编码路由（如 `href="/login"`）替换为路由工具调用
- 使用 `href={route('/login')}` 或 `href={route(routes.AUTH.LOGIN)}`


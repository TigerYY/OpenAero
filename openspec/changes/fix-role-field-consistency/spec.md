# 角色字段一致性修复 - 规范文档

## ADDED Requirements

### Requirement: 统一使用roles数组进行权限验证

#### Scenario: 认证函数返回用户信息
- 当调用 `authenticateRequest` 函数时
- 应该返回包含 `roles` 数组的用户对象
- 并且不再依赖 `profile.role` 单字段

#### Scenario: 角色权限检查
- 当检查用户管理员权限时
- 应该使用 `userRoles.includes('ADMIN')` 或 `userRoles.includes('SUPER_ADMIN')`
- 而不是 `user.role === 'ADMIN'`

#### Scenario: API路由权限验证
- 当访问 `/api/admin/*` 路由时
- 应该使用 `authResult.user.roles.includes('ADMIN')` 或 `authResult.user.roles.includes('SUPER_ADMIN')`
- 而不是 `authResult.user.role === 'ADMIN'`

#### Scenario: 前端组件权限渲染
- 当根据权限显示/隐藏组件时
- 应该使用 `hasRole(roles, requiredRole)` 检查
- 而不是 `profile.role === 'ROLE_NAME'`

#### Scenario: 用户菜单角色显示
- 当在UserMenu组件中显示用户角色时
- 应该从 `profile.roles` 数组获取角色信息
- 并且使用 `getPrimaryRole(roles)` 获取主要角色显示

### Requirement: 角色数组标准化工具函数

#### Scenario: 安全获取用户角色数组
- 当需要获取用户角色时
- 应该使用 `getUserRoles(profile)` 辅助函数
- 该函数处理数组和单字段的兼容性

#### Scenario: 主要角色获取
- 当需要显示用户主要角色时
- 应该使用 `getPrimaryRole(roles)` 函数
- 按优先级返回最重要的角色（SUPER_ADMIN > ADMIN > CREATOR > USER）

#### Scenario: 权限检查函数标准化
- 当验证管理员权限时
- 应该使用 `hasAdminRole(roles)` 函数
- 该函数检查ADMIN或SUPER_ADMIN角色

- 当验证创作者权限时
- 应该使用 `hasCreatorRole(roles)` 函数
- 该函数检查CREATOR角色

### Requirement: API响应格式标准化

#### Scenario: 用户信息API响应
- 当API返回用户信息时
- 应该包含标准的 `roles` 数组字段
- 可选包含 `primaryRole` 字段用于显示

#### Scenario: 批量角色操作
- 当进行批量角色更新时
- 应该直接操作roles数组
- 而不是单个role字段

## MODIFIED Requirements

### Requirement: 移除profile.role依赖
- 所有直接使用 `profile.role` 的代码都应该被移除
- 替换为基于 `roles` 数组的权限检查

#### Scenario: 数据库查询优化
- 当查询特定角色用户时
- 应该使用PostgreSQL的数组操作符
- 例如 `WHERE roles && ARRAY['ADMIN', 'SUPER_ADMIN']`

#### Scenario: 会话权限检查
- 当在中间件中检查权限时
- 应该使用 `session.user.roles` 数组
- 更新所有相关的权限检查逻辑

## REMOVED Requirements

### Requirement: 移除所有profile.role直接比较
- 所有 `profile.role === 'ROLE_NAME'` 的检查都应该被移除
- 替换为基于roles数组的包含检查

- 所有 `authResult.user.role === 'ROLE_NAME'` 的检查都应该被移除
- 替换为基于 `authResult.user.roles.includes('ROLE_NAME')` 的包含检查

## Implementation Notes

1. **向后兼容性**: 在过渡期间保持对旧代码的兼容
2. **错误处理**: 当roles为空或无效时提供默认值
3. **性能优化**: 避免重复的角色解析操作
4. **类型安全**: 使用TypeScript确保类型一致性
5. **API兼容性**: 保持现有API接口签名不变
6. **查询性能**: 优化数据库查询以利用数组索引
7. **安全考虑**: 确保权限检查的严格性和一致性

## Priority Files to Update

### High Priority
- `src/lib/auth-helpers.ts`
- `src/lib/api-helpers.ts` 
- `src/contexts/AuthContext.tsx`
- `src/components/auth/UserMenu.tsx`

### Medium Priority
- All `/api/admin/*` routes
- All `/api/creators/*` routes
- All `/api/solutions/*` routes
- Admin page components
- Creator page components

### Low Priority
- Notification components
- Review components
- Other permission-related UI components
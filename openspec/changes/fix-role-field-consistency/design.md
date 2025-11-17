# 角色字段一致性修复设计

## 架构决策

### 1. 数据模型一致性
- **统一使用**: `roles: UserRole[]` 数组字段
- **移除废弃**: 所有 `role: UserRole` 单字段引用
- **向后兼容**: 提供迁移工具和兼容性检查

### 2. 权限检查模式

#### 新的权限检查函数
```typescript
// 检查用户是否具有任一指定角色
function hasAnyRole(userRoles: string[], requiredRoles: string[]): boolean

// 检查用户是否具有所有指定角色  
function hasAllRoles(userRoles: string[], requiredRoles: string[]): boolean

// 获取用户主要角色（用于显示）
function getPrimaryRole(userRoles: string[]): string
```

### 3. API响应格式标准化

#### 用户对象标准格式
```typescript
interface User {
  id: string;
  email: string;
  roles: string[];           // 标准角色数组
  primaryRole?: string;       // 主要角色（用于兼容性）
}
```

### 4. 迁移策略

#### 阶段性迁移
1. **兼容模式**: 同时支持 `roles` 和 `role`
2. **警告模式**: 使用 `role` 时发出警告
3. **严格模式**: 仅支持 `roles` 数组

#### 数据一致性
- 确保所有用户记录都有 `roles` 数组
- 清理孤立的 `role` 字段数据
- 验证角色枚举值的一致性

## 实现原则

1. **最小破坏性**: 保持现有API接口不变
2. **渐进式迁移**: 分阶段实施，每阶段可独立验证
3. **全面测试**: 每个修改都有对应的测试覆盖
4. **向后兼容**: 在迁移期间保持旧代码可用
5. **性能优化**: 避免不必要的数据库查询
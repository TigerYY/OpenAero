# 用户角色体系分析与多角色支持方案

## 当前状态分析

### 1. 数据库结构
- **Prisma Schema**: `role UserRole @default(USER)` - 单一角色字段
- **数据库表**: `user_profiles.role` 为枚举类型，只能存储一个值
- **额外权限**: `permissions String[]` - 已支持权限数组，但主要用于细粒度权限

### 2. 角色定义
```prisma
enum UserRole {
  USER              // 普通用户 - 可浏览和购买
  CREATOR           // 创作者 - 可上传方案
  REVIEWER          // 审核员 - 可审核方案
  FACTORY_MANAGER   // 工厂管理员 - 管理工厂和试产
  ADMIN             // 管理员 - 完全权限
  SUPER_ADMIN       // 超级管理员 - 系统最高权限
}
```

### 3. 当前使用场景
- 角色检查：`profile.role === 'ADMIN'`
- 权限验证：`hasRole(user, requiredRoles)`
- 前端显示：单选下拉框

## 需求：多角色支持

### 业务场景
1. **创作者 + 审核员**：用户既是创作者，也可以审核其他创作者的方案
2. **创作者 + 工厂管理员**：用户既是创作者，也管理工厂试产
3. **审核员 + 管理员**：用户既审核方案，也进行系统管理
4. **多重身份**：用户可能同时拥有多个专业角色

### 设计原则
1. **向后兼容**：现有单一角色数据需要迁移
2. **权限合并**：多个角色的权限应该合并（取并集）
3. **角色层级**：SUPER_ADMIN > ADMIN > 其他角色
4. **UI 友好**：前端支持多选，清晰显示所有角色

## 实施方案

### 阶段 1：数据库结构修改

#### 1.1 Prisma Schema 修改
```prisma
model UserProfile {
  // ... 其他字段 ...
  
  // 角色与权限 - 修改为数组
  roles       UserRole[] @default([USER])  // 多角色数组
  permissions String[]                      // 额外权限标识符数组
  
  // ... 其他字段 ...
}
```

#### 1.2 数据库迁移
- 将 `role` 列改为 `roles` 数组类型
- 迁移现有数据：`role` → `[role]`
- 创建索引：`CREATE INDEX idx_user_profiles_roles ON user_profiles USING GIN(roles);`

### 阶段 2：后端代码更新

#### 2.1 角色检查函数更新
```typescript
// 检查用户是否有指定角色（支持多角色）
export function hasRole(user: any, requiredRoles: UserRole | UserRole[]): boolean {
  if (!user || !user.roles || !Array.isArray(user.roles)) return false;
  
  const userRoles = user.roles;
  const required = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  return required.some(role => userRoles.includes(role));
}

// 检查用户是否有最高权限角色
export function hasHighestRole(user: any): UserRole | null {
  if (!user?.roles || !Array.isArray(user.roles)) return null;
  
  const roleHierarchy: Record<UserRole, number> = {
    USER: 1,
    CREATOR: 2,
    REVIEWER: 3,
    FACTORY_MANAGER: 3,
    ADMIN: 4,
    SUPER_ADMIN: 5,
  };
  
  return user.roles.reduce((highest, role) => {
    const currentLevel = roleHierarchy[role] || 0;
    const highestLevel = roleHierarchy[highest] || 0;
    return currentLevel > highestLevel ? role : highest;
  }, user.roles[0]);
}
```

#### 2.2 API 路由更新
- 更新所有角色检查逻辑
- 更新用户创建/更新接口，支持多角色
- 更新权限验证中间件

### 阶段 3：前端界面更新

#### 3.1 用户管理页面
- 将角色选择改为多选组件（Checkbox 或 MultiSelect）
- 显示所有角色标签
- 支持批量角色分配

#### 3.2 用户资料显示
- 显示所有角色徽章
- 根据最高角色显示主要身份

## 迁移计划

### 步骤 1：创建迁移脚本
```sql
-- 1. 添加新列 roles
ALTER TABLE user_profiles 
ADD COLUMN roles user_role[] DEFAULT ARRAY['USER']::user_role[];

-- 2. 迁移现有数据
UPDATE user_profiles 
SET roles = ARRAY[role]::user_role[];

-- 3. 设置 NOT NULL 约束
ALTER TABLE user_profiles 
ALTER COLUMN roles SET NOT NULL;

-- 4. 创建 GIN 索引（用于数组查询）
CREATE INDEX idx_user_profiles_roles ON user_profiles USING GIN(roles);

-- 5. 保留 role 列作为兼容（可选，后续删除）
-- ALTER TABLE user_profiles DROP COLUMN role;
```

### 步骤 2：代码更新顺序
1. 更新 Prisma Schema
2. 生成 Prisma Client
3. 更新后端工具函数
4. 更新 API 路由
5. 更新前端组件
6. 执行数据库迁移
7. 测试验证

## 风险评估

### 高风险
- **数据迁移**：需要确保现有数据正确迁移
- **权限检查**：所有权限检查逻辑需要更新
- **向后兼容**：现有 API 调用可能受影响

### 中风险
- **性能影响**：数组查询可能需要优化索引
- **UI/UX**：多选界面需要良好的用户体验

### 低风险
- **测试覆盖**：需要全面测试各种角色组合

## 测试计划

1. **单元测试**：角色检查函数
2. **集成测试**：API 权限验证
3. **E2E 测试**：用户角色分配流程
4. **数据迁移测试**：现有数据迁移验证

## 后续优化

1. **角色权限合并**：自动合并多个角色的权限
2. **角色继承**：定义角色之间的继承关系
3. **动态权限**：基于角色的动态权限计算
4. **审计日志**：记录角色变更历史


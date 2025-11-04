# 路由架构重构设计文档

## 架构问题分析

### 当前架构问题

1. **路由生成策略不一致**
   - 部分组件使用 `useRouting()` hook (正确)
   - 大部分组件使用硬编码路由 (错误)
   - 导致国际化路由不匹配

2. **中间件与组件层路由逻辑分离**
   - 中间件已支持国际化路径匹配
   - 但组件层未统一使用相同策略
   - 造成路由不一致问题

3. **缺乏统一的路由抽象层**
   - 路由逻辑分散在各个组件中
   - 难以维护和扩展
   - 容易引入错误

## 重构方案设计

### 核心设计原则

1. **单一数据源** - 所有路由定义集中管理
2. **统一接口** - 所有组件使用相同的路由生成方式
3. **类型安全** - 路由生成具备完整的TypeScript支持
4. **可测试性** - 路由逻辑易于单元测试

### 架构层次设计

```
┌─────────────────┐
│   组件层 (UI)     │ ← 使用 useRouting() hook
├─────────────────┤
│   路由抽象层      │ ← RoutingUtils 工具类
├─────────────────┤
│   路由定义层      │ ← ROUTES 常量定义
├─────────────────┤
│   国际化层       │ ← next-intl 集成
└─────────────────┘
```

### 技术实现细节

#### 1. 路由定义层 (`src/lib/routing.ts`)

```typescript
// 集中定义所有路由常量
const ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    // ...
  },
  BUSINESS: {
    HOME: '/',
    SOLUTIONS: '/solutions',
    // ...
  }
} as const;
```

#### 2. 路由抽象层 (`RoutingUtils`)

```typescript
export class RoutingUtils {
  // 生成带locale的完整路由
  static generateRoute(locale: string, route: string): string
  
  // 检查是否为公开路由
  static isPublicRoute(pathname: string): boolean
  
  // 从路径中提取locale
  static extractLocaleFromPath(pathname: string): string | null
}
```

#### 3. React Hook层 (`useRouting`)

```typescript
export function useRouting() {
  const locale = useLocale();
  
  return {
    route: (route: string) => RoutingUtils.generateRoute(locale, route),
    routes: ROUTES,
    utils: RoutingUtils,
    currentLocale: locale,
  };
}
```

### 重构策略

#### 阶段1: 基础架构完善
- 完善现有 `RoutingUtils` 功能
- 添加路由验证和测试工具
- 创建路由迁移辅助工具

#### 阶段2: 组件层重构
- 按优先级修复关键组件
- 批量更新导航组件
- 修复页面组件路由

#### 阶段3: 验证和优化
- 全面测试路由功能
- 性能优化和缓存策略
- 文档和最佳实践

### 兼容性考虑

1. **向后兼容** - 保持现有API不变
2. **渐进式迁移** - 支持分阶段重构
3. **错误处理** - 提供清晰的错误信息
4. **回滚机制** - 确保可安全回滚

### 性能影响

- **轻微性能开销** - 路由生成逻辑简单
- **内存优化** - 路由常量可缓存
- **构建优化** - 不影响构建时间

## 风险评估与缓解

### 高风险区域
- 导航组件重构可能影响用户体验
- 中间件路由匹配需要精确测试

### 缓解措施
- 充分测试关键用户流程
- 分阶段部署和验证
- 建立回滚计划
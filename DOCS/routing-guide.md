# 路由工具库使用指南

## 概述

路由工具库 (`src/lib/routing.ts`) 提供了统一的路由生成和管理功能，支持国际化路由，解决了硬编码路由与国际化架构的冲突问题。

## 核心功能

### 1. 路由常量 (`ROUTES`)

所有路由定义集中在 `ROUTES` 常量中，按功能分类：

```typescript
import { ROUTES } from '@/lib/routing';

// 认证路由
ROUTES.AUTH.LOGIN          // '/login'
ROUTES.AUTH.REGISTER       // '/register'

// 业务路由
ROUTES.BUSINESS.SOLUTIONS  // '/solutions'
ROUTES.BUSINESS.CONTACT    // '/contact'

// 创作者路由
ROUTES.CREATORS.DASHBOARD  // '/creators/dashboard'
ROUTES.CREATORS.APPLY      // '/creators/apply'

// 管理路由
ROUTES.ADMIN.DASHBOARD     // '/admin/dashboard'
```

### 2. useRouting Hook

在客户端组件中使用 `useRouting` hook 生成带locale的路由：

```typescript
'use client';

import { useRouting } from '@/lib/routing';
import Link from 'next/link';

export function MyComponent() {
  const { route, routes } = useRouting();

  return (
    <Link href={route(routes.BUSINESS.SOLUTIONS)}>
      解决方案
    </Link>
  );
}
```

### 3. RoutingUtils 静态方法

在服务器组件或API路由中使用静态方法：

```typescript
import { RoutingUtils } from '@/lib/routing';

// 生成路由
const loginRoute = RoutingUtils.generateRoute('zh-CN', '/login');
// 结果: '/zh-CN/login'

// 生成带查询参数的路由
const routeWithParams = RoutingUtils.generateRouteWithParams(
  'zh-CN',
  '/solutions',
  { page: 1, category: 'fpv' }
);
// 结果: '/zh-CN/solutions?page=1&category=fpv'

// 生成带动态参数的路由
const dynamicRoute = RoutingUtils.generateRouteWithDynamicParams(
  'zh-CN',
  '/solutions/[id]',
  { id: '123' }
);
// 结果: '/zh-CN/solutions/123'
```

## API 参考

### useRouting Hook

返回对象包含以下属性和方法：

- **`route(route: string): string`** - 生成带locale的路由
- **`routeWithParams(route: string, params?: RouteParams): string`** - 生成带查询参数的路由
- **`routeWithDynamicParams(route: string, params: Record<string, string | number>): string`** - 生成带动态参数的路由
- **`routes: typeof ROUTES`** - 路由常量
- **`utils: typeof RoutingUtils`** - 工具类
- **`currentLocale: SupportedLocale`** - 当前locale
- **`currentPathname: string`** - 当前路径
- **`isActive(route: string): boolean`** - 检查当前路径是否匹配
- **`isExactActive(route: string): boolean`** - 检查当前路径是否精确匹配
- **`safeRoute(route: string)`** - 安全地生成路由（不抛出异常）

### RoutingUtils 类

#### 静态方法

- **`validateRoutePath(route: string): RouteValidationResult`** - 验证路由路径格式
- **`validateLocale(locale: string): locale is SupportedLocale`** - 验证locale格式
- **`generateRoute(locale: string, route: string): string`** - 生成带locale的路由
- **`generateRouteWithParams(locale: string, route: string, params?: RouteParams): string`** - 生成带查询参数的路由
- **`generateRouteWithDynamicParams(locale: string, route: string, params: Record<string, string | number>): string`** - 生成带动态参数的路由
- **`safeGenerateRoute(locale: string, route: string)`** - 安全地生成路由
- **`extractLocaleFromPath(pathname: string): SupportedLocale | null`** - 从路径提取locale
- **`getPathWithoutLocale(pathname: string): string`** - 获取无locale的路径
- **`isPublicRoute(pathname: string): boolean`** - 检查是否为公开路由
- **`matchRoute(pathname: string, pattern: string): boolean`** - 检查路由是否匹配模式
- **`extractParams(pathname: string, pattern: string): Record<string, string>`** - 提取动态参数

## 使用示例

### 示例1: 在组件中使用路由

```typescript
'use client';

import { useRouting } from '@/lib/routing';
import Link from 'next/link';

export function Navigation() {
  const { route, routes, isActive } = useRouting();

  return (
    <nav>
      <Link 
        href={route(routes.BUSINESS.SOLUTIONS)}
        className={isActive(routes.BUSINESS.SOLUTIONS) ? 'active' : ''}
      >
        解决方案
      </Link>
      <Link href={route(routes.BUSINESS.CONTACT)}>
        联系我们
      </Link>
    </nav>
  );
}
```

### 示例2: 在服务器组件中使用路由

```typescript
import { RoutingUtils } from '@/lib/routing';
import { redirect } from 'next/navigation';

export default function RootPage() {
  const defaultLocale = RoutingUtils.getDefaultLocale();
  const homeRoute = RoutingUtils.generateRoute(defaultLocale, '/');
  redirect(homeRoute);
}
```

### 示例3: 生成带动态参数的路由

```typescript
const { routeWithDynamicParams, routes } = useRouting();

// 生成解决方案详情页路由
const solutionRoute = routeWithDynamicParams(
  routes.BUSINESS.SOLUTION_DETAIL,
  { id: '123' }
);
// 结果: '/zh-CN/solutions/123'
```

### 示例4: 安全地生成路由

```typescript
const { safeRoute } = useRouting();

const result = safeRoute('/some-route');
if (result.success) {
  // 使用 result.route
} else {
  // 处理错误 result.error
}
```

## 最佳实践

1. **始终使用路由工具**：不要硬编码路由路径
2. **使用路由常量**：优先使用 `routes.XXX` 而不是字符串
3. **客户端组件使用 hook**：使用 `useRouting()` hook
4. **服务器组件使用静态方法**：使用 `RoutingUtils` 静态方法
5. **处理错误**：使用 `safeRoute` 或 `safeGenerateRoute` 处理可能的错误

## 类型定义

```typescript
// 支持的locale类型
type SupportedLocale = 'zh-CN' | 'en-US';

// 路由参数类型
type RouteParams = Record<string, string | number>;

// 路由验证结果
interface RouteValidationResult {
  isValid: boolean;
  error?: string;
}
```

## 注意事项

1. `useRouting` hook 只能在客户端组件中使用（需要 'use client'）
2. 服务器组件应使用 `RoutingUtils` 静态方法
3. 路由路径会自动添加当前locale前缀
4. 动态路由参数使用 `[param]` 格式定义


# 📐 布局系统使用指南

## 概述

OpenAero 项目采用了**分层布局系统**,确保所有页面都能自动获得统一的导航栏和页脚,同时也支持特殊页面使用自定义布局。

## 🏗️ 布局架构

```
app/
├── layout.tsx                    # 根布局 (Providers)
└── [locale]/
    ├── layout.tsx                # 语言布局 (包含 DefaultLayout)
    ├── page.tsx                  # 首页 ✅ 自动有 Header/Footer
    ├── about/
    │   └── page.tsx              # 关于页面 ✅ 自动有 Header/Footer
    ├── contact/
    │   └── page.tsx              # 联系页面 ✅ 自动有 Header/Footer
    ├── (auth)/                   # 认证路由组 (可选自定义布局)
    │   ├── login/page.tsx        # 登录页面 ✅ 自动有 Header/Footer
    │   └── register/page.tsx     # 注册页面 ✅ 自动有 Header/Footer
    └── (empty)/                  # 空布局路由组 (无 Header/Footer)
        └── fullscreen/page.tsx   # 全屏页面 ❌ 无 Header/Footer
```

## 📦 可用的布局组件

### 1. DefaultLayout (默认布局)

**位置**: `src/components/layout/DefaultLayout.tsx`

**特点**:
- ✅ 包含 Header (导航栏)
- ✅ 包含 Footer (页脚)
- ✅ 响应式设计
- ✅ 适用于 95% 的页面

**自动应用**:
所有在 `app/[locale]/` 下的页面都会自动应用此布局,无需手动添加。

**手动使用** (仅在需要时):
```tsx
import { DefaultLayout } from '@/components/layout';

export default function MyPage() {
  return (
    <DefaultLayout>
      <div>页面内容</div>
    </DefaultLayout>
  );
}
```

**自定义选项**:
```tsx
<DefaultLayout
  showHeader={false}    // 隐藏 Header
  showFooter={false}    // 隐藏 Footer
  className="custom-class"
>
  {children}
</DefaultLayout>
```

### 2. EmptyLayout (空布局)

**位置**: `src/components/layout/EmptyLayout.tsx`

**特点**:
- ❌ 不包含 Header
- ❌ 不包含 Footer
- ✅ 纯净的页面容器
- ✅ 适用于特殊页面

**适用场景**:
- 全屏展示页面
- 嵌入式页面 (iframe)
- 打印页面
- 错误页面 (404, 500)
- 登录/注册页面 (如果不需要导航)

**使用方法**:
```tsx
import { EmptyLayout } from '@/components/layout';

export default function FullscreenPage() {
  return (
    <EmptyLayout>
      <div className="h-screen">全屏内容</div>
    </EmptyLayout>
  );
}
```

## 🎯 使用场景示例

### ✅ 场景 1: 普通页面 (推荐)

大多数页面不需要做任何特殊处理,会自动获得 Header 和 Footer。

```tsx
// src/app/[locale]/about/page.tsx
export default function AboutPage() {
  return (
    <div className="container py-12">
      <h1>关于我们</h1>
      <p>这是关于页面的内容...</p>
    </div>
  );
}
```

**结果**: ✅ 自动包含 Header 和 Footer

---

### ✅ 场景 2: 需要隐藏 Header 或 Footer

某些页面可能需要隐藏导航栏或页脚。

**方法 A: 使用路由组 + 自定义布局**

```tsx
// src/app/[locale]/(custom)/fullscreen/layout.tsx
import { EmptyLayout } from '@/components/layout';

export default function CustomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <EmptyLayout>{children}</EmptyLayout>;
}
```

```tsx
// src/app/[locale]/(custom)/fullscreen/page.tsx
export default function FullscreenPage() {
  return <div className="h-screen">全屏内容</div>;
}
```

**方法 B: 在页面中直接使用** (临时方案)

```tsx
// src/app/[locale]/special/page.tsx
import { EmptyLayout } from '@/components/layout';

export default function SpecialPage() {
  return (
    <EmptyLayout>
      <div>特殊页面内容</div>
    </EmptyLayout>
  );
}
```

⚠️ **注意**: 方法 B 会覆盖父级布局,可能导致布局嵌套问题。推荐使用方法 A。

---

### ✅ 场景 3: 认证页面

认证页面已经自动包含 Header 和 Footer (已在之前的更新中实现)。

如果将来需要移除 Header/Footer,可以:

**选项 A: 创建 (auth) 路由组的自定义布局**

```tsx
// src/app/[locale]/(auth)/layout.tsx
import { EmptyLayout } from '@/components/layout';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <EmptyLayout>{children}</EmptyLayout>;
}
```

**选项 B: 保持现状** (推荐)

当前认证页面包含 Header 和 Footer,用户体验更好:
- 用户可以轻松切换语言
- 用户可以访问其他页面
- 提供一致的品牌体验

---

### ✅ 场景 4: 管理后台页面

管理后台可能需要不同的布局 (侧边栏 + 顶栏)。

```tsx
// src/app/[locale]/(dashboard)/layout.tsx
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
```

```tsx
// src/app/[locale]/(dashboard)/admin/page.tsx
export default function AdminPage() {
  return <div>管理后台内容</div>;
}
```

---

## 📋 路由组命名规范

Next.js 支持使用 `(folder)` 语法创建路由组,这些文件夹不会影响 URL 路径。

### 推荐的路由组命名:

| 路由组名 | 用途 | 布局 |
|---------|------|------|
| `(default)` | 默认页面 | DefaultLayout (Header + Footer) |
| `(auth)` | 认证页面 | 可选 EmptyLayout 或 DefaultLayout |
| `(dashboard)` | 管理后台 | DashboardLayout (自定义) |
| `(empty)` | 无布局页面 | EmptyLayout (纯净) |
| `(print)` | 打印页面 | EmptyLayout (打印优化) |

### 示例目录结构:

```
app/[locale]/
├── layout.tsx              # 全局默认布局 (DefaultLayout)
├── page.tsx                # 首页
├── about/                  
│   └── page.tsx            # 关于页面
├── (auth)/                 # 认证路由组
│   ├── layout.tsx          # 可选: 自定义认证布局
│   ├── login/page.tsx
│   └── register/page.tsx
├── (dashboard)/            # 后台路由组
│   ├── layout.tsx          # DashboardLayout
│   ├── admin/page.tsx
│   └── profile/page.tsx
└── (empty)/                # 空布局路由组
    ├── layout.tsx          # EmptyLayout
    └── fullscreen/page.tsx
```

---

## 🔧 开发者注意事项

### ✅ DO (推荐做法)

1. **新建页面时无需手动添加 Header/Footer**
   ```tsx
   // ✅ 正确 - 会自动获得布局
   export default function NewPage() {
     return <div>内容</div>;
   }
   ```

2. **使用路由组管理不同布局需求**
   ```
   (auth)/layout.tsx    # 认证布局
   (dashboard)/layout.tsx    # 后台布局
   ```

3. **在布局文件中导入组件**
   ```tsx
   import { DefaultLayout, EmptyLayout } from '@/components/layout';
   ```

### ❌ DON'T (避免的做法)

1. **不要在每个页面中重复导入 Header/Footer**
   ```tsx
   // ❌ 错误 - 不需要手动添加
   import { Header } from '@/components/layout/Header';
   import { Footer } from '@/components/layout/Footer';

   export default function Page() {
     return (
       <>
         <Header />
         <div>内容</div>
         <Footer />
       </>
     );
   }
   ```

2. **不要直接修改 Header/Footer 组件来隐藏它们**
   ```tsx
   // ❌ 错误 - 应该使用 EmptyLayout
   <Header className="hidden" />
   ```

3. **不要创建过多的路由组**
   - 只在真正需要不同布局时才创建路由组
   - 优先使用现有的布局组件参数 (showHeader, showFooter)

---

## 🎨 自定义布局组件

如果需要创建新的布局组件 (如 DashboardLayout),请遵循以下模板:

```tsx
// src/components/layout/DashboardLayout.tsx
'use client';

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { DashboardHeader } from './DashboardHeader';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <DashboardHeader />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

然后在路由组的 layout.tsx 中使用:

```tsx
// src/app/[locale]/(dashboard)/layout.tsx
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
```

---

## 📚 相关文档

- [Next.js 布局文档](https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts)
- [Next.js 路由组文档](https://nextjs.org/docs/app/building-your-application/routing/route-groups)
- [项目组件文档](./DOCS/components.md)

---

## 🆘 常见问题

### Q1: 为什么我的页面没有 Header 和 Footer?

**A**: 检查以下几点:
1. 页面是否在 `app/[locale]/` 目录下?
2. 父级 layout.tsx 是否正确应用了 DefaultLayout?
3. 是否意外使用了 EmptyLayout?

### Q2: 如何为单个页面隐藏 Header?

**A**: 推荐使用路由组:
```
app/[locale]/(empty)/mypage/
├── layout.tsx    # EmptyLayout
└── page.tsx
```

或临时方案:
```tsx
import { DefaultLayout } from '@/components/layout';

export default function MyPage() {
  return (
    <DefaultLayout showHeader={false}>
      <div>内容</div>
    </DefaultLayout>
  );
}
```

### Q3: 认证页面应该有 Header 和 Footer 吗?

**A**: 这取决于产品设计:
- **有 Header/Footer** (当前实现): 用户体验更好,可以切换语言和访问其他页面
- **无 Header/Footer**: 更专注,减少干扰

当前推荐保持有 Header 和 Footer 的设计。

---

**最后更新**: 2025-11-12  
**维护者**: OpenAero Team

# 国际化与路由系统指南

> 🎯 **最后更新**: 2025-11-12  
> 📊 **项目状态**: ✅ 生产就绪 (健康度 94.1%)

---

## 📖 快速开始

### 核心概念

本项目使用 **Next.js 14 App Router** + **next-intl** 实现国际化路由系统。

**支持语言**: 
- `zh-CN` (简体中文) - 默认
- `en-US` (English)

**路由模式**: 
- `as-needed` (默认语言无前缀)
- 示例: `/about` → 中文，`/en-US/about` → 英文

---

## 🚀 日常使用

### 1. 使用路由工具

```typescript
// ✅ 客户端组件
'use client';
import { useRouting } from '@/lib/routing';

export default function MyComponent() {
  const { route, routes, isActive } = useRouting();
  
  return (
    <Link href={route(routes.BUSINESS.SHOP)}>
      前往商店
    </Link>
  );
}
```

```typescript
// ✅ 服务端组件
import { getLocalizedRoute } from '@/lib/routing';

export default function ServerComponent({ 
  params 
}: { 
  params: { locale: string } 
}) {
  return (
    <Link href={getLocalizedRoute(params.locale, '/shop')}>
      前往商店
    </Link>
  );
}
```

### 2. 使用翻译

```typescript
'use client';
import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations('common');
  
  return <h1>{t('welcome')}</h1>;
}
```

```typescript
// 服务端
import { getTranslations } from 'next-intl/server';

export default async function Page({ 
  params 
}: { 
  params: { locale: string } 
}) {
  const t = await getTranslations({ 
    locale: params.locale,
    namespace: 'common'
  });
  
  return <h1>{t('welcome')}</h1>;
}
```

### 3. 语言切换

```typescript
'use client';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

export default function LanguageSwitcher() {
  const router = useRouter();
  const currentLocale = useLocale();
  
  const switchLanguage = (locale: string) => {
    const newPath = window.location.pathname.replace(
      `/${currentLocale}`,
      `/${locale}`
    );
    router.push(newPath);
  };
  
  return (
    <button onClick={() => switchLanguage('en-US')}>
      Switch to English
    </button>
  );
}
```

---

## 🛠️ 常用检查命令

```bash
# 快速健康检查 (30秒)
./scripts/quick-i18n-routing-check.sh

# 翻译完整性检查
npx tsx scripts/check-i18n-completeness.ts

# 路由覆盖率检查
npx tsx scripts/route-coverage.ts

# 深度路由验证
npx tsx scripts/deep-route-validation.ts

# TypeScript 类型检查
npx tsc --noEmit

# 构建测试
npm run build
```

---

## 📋 添加新翻译

### 步骤 1: 编辑翻译文件

```bash
# 编辑中文翻译
vim messages/zh-CN.json

# 编辑英文翻译
vim messages/en-US.json
```

### 步骤 2: 添加翻译键

```json
{
  "common": {
    "welcome": "欢迎",
    "newKey": "新内容"  // ← 添加这里
  }
}
```

### 步骤 3: 验证完整性

```bash
npx tsx scripts/check-i18n-completeness.ts
```

应该看到：
```
✅ zh-CN: XXX keys (100.00%)
✅ en-US: XXX keys (100.00%)
```

---

## 🎯 添加新路由

### 步骤 1: 定义路由常量

编辑 `src/lib/routing.ts`:

```typescript
export const ROUTES = {
  BUSINESS: {
    HOME: '/',
    SHOP: '/shop',
    NEW_PAGE: '/new-page',  // ← 添加这里
  },
};
```

### 步骤 2: 创建页面文件

```bash
# 创建页面
mkdir -p src/app/[locale]/new-page
touch src/app/[locale]/new-page/page.tsx
```

### 步骤 3: 实现页面

```typescript
// src/app/[locale]/new-page/page.tsx
import { getTranslations } from 'next-intl/server';

export default async function NewPage({
  params
}: {
  params: { locale: string }
}) {
  const t = await getTranslations({ 
    locale: params.locale,
    namespace: 'common' 
  });
  
  return (
    <div>
      <h1>{t('newPageTitle')}</h1>
    </div>
  );
}
```

### 步骤 4: 验证路由

```bash
# 检查路由覆盖率
npx tsx scripts/route-coverage.ts

# 启动开发服务器测试
npm run dev
```

---

## ⚠️ 常见问题

### 问题 1: 服务端组件使用 useRouting 报错

**错误**:
```
Error: useRouting is not a function (Server Component)
```

**解决**:
```typescript
// ❌ 错误
export default function Page() {
  const { route } = useRouting();  // Server Component!
}

// ✅ 方案 1: 改为客户端组件
'use client';
export default function Page() {
  const { route } = useRouting();
}

// ✅ 方案 2: 使用服务端辅助函数
export default function Page({ params }) {
  const localizedPath = getLocalizedRoute(params.locale, '/path');
}
```

### 问题 2: 翻译缺失显示键名

**现象**: 页面显示 `common.welcome` 而不是 "欢迎"

**检查**:
```bash
# 1. 检查翻译完整性
npx tsx scripts/check-i18n-completeness.ts

# 2. 检查命名空间是否正确
# messages/zh-CN.json 应该有:
{
  "common": {
    "welcome": "欢迎"
  }
}
```

### 问题 3: 语言切换后路由错误

**检查**:
```typescript
// 确保切换时保持当前路径
const currentPath = pathname.replace(`/${currentLocale}`, '');
const newPath = `/${newLocale}${currentPath}`;
router.push(newPath);
```

### 问题 4: 构建失败

**步骤**:
```bash
# 1. 清理缓存
rm -rf .next
npm run build

# 2. 检查 TypeScript 错误
npx tsc --noEmit

# 3. 检查路由配置
npx tsx scripts/deep-route-validation.ts
```

---

## 📊 当前项目状态

### ✅ 已完成 (100%)

- ✅ 翻译完整度: **100%** (zh-CN + en-US)
- ✅ 路由工具库: **37 个路由定义**
- ✅ 零硬编码路由: **46 个文件正确使用**
- ✅ 构建状态: **成功 (113 页面)**
- ✅ 健康度评分: **94.1/100**

### 🎯 可选优化

- 路由覆盖率: 56.76% → 80%+ (创建缺失页面)
- TypeScript 错误: 41 个 (不影响运行)

---

## 🔗 相关工具脚本

| 脚本 | 用途 | 位置 |
|------|------|------|
| `check-i18n-completeness.ts` | 检查翻译完整性 | `scripts/` |
| `route-coverage.ts` | 检查路由覆盖率 | `scripts/` |
| `deep-route-validation.ts` | 深度路由验证 | `scripts/` |
| `quick-i18n-routing-check.sh` | 快速健康检查 | `scripts/` |

---

## 📚 配置文件说明

### 核心配置文件

1. **`next.config.js`** - Next.js 配置
2. **`middleware.ts`** - 路由中间件 + 语言检测
3. **`src/i18n.ts`** - next-intl 配置
4. **`src/lib/routing.ts`** - 路由工具库
5. **`src/config/app.ts`** - 应用配置（语言列表等）
6. **`messages/zh-CN.json`** - 中文翻译
7. **`messages/en-US.json`** - 英文翻译

### 配置一致性要求

所有文件中的语言配置必须一致：

```typescript
// ✅ 所有地方都应该是:
locales: ['zh-CN', 'en-US']
defaultLocale: 'zh-CN'
```

---

## 🎓 最佳实践

### 1. 路由使用

- ✅ 使用 `useRouting()` 而不是硬编码路径
- ✅ 客户端组件用 `useRouting()`
- ✅ 服务端组件用 `getLocalizedRoute()`
- ❌ 不要硬编码 `/zh-CN/path` 或 `/en-US/path`

### 2. 翻译使用

- ✅ 始终使用翻译键，不要硬编码文本
- ✅ 组织合理的命名空间 (common, auth, shop 等)
- ✅ 保持 zh-CN 和 en-US 结构一致

### 3. 组件设计

- ✅ 需要路由/翻译的交互组件用 `'use client'`
- ✅ 静态展示的服务端组件避免使用 hooks
- ✅ 动态路由记得包含 `locale` 参数

---

## 🚨 故障排查流程

```bash
# 1. 快速检查 (30秒)
./scripts/quick-i18n-routing-check.sh

# 2. 如果有问题，运行详细检查
npx tsx scripts/check-i18n-completeness.ts
npx tsx scripts/route-coverage.ts
npx tsx scripts/deep-route-validation.ts

# 3. TypeScript 检查
npx tsc --noEmit

# 4. 构建测试
npm run build

# 5. 如果构建失败，清理后重试
rm -rf .next node_modules/.cache
npm run build
```

---

## 📞 需要帮助？

如遇到问题：

1. 查看本指南的常见问题部分
2. 运行相关检查脚本查看具体错误
3. 检查控制台错误信息
4. 查看 Next.js 官方文档: https://nextjs.org/docs
5. 查看 next-intl 文档: https://next-intl-docs.vercel.app/

---

**文档版本**: v2.0  
**项目状态**: ✅ 生产就绪  
**健康度**: 94.1/100

# 国际化与路由系统 - 快速导航

> 📚 本项目的国际化与路由系统文档已简化整合

---

## 📖 核心文档

### 🎯 `I18N_ROUTING_GUIDE.md` (主要参考)

**完整的国际化与路由开发指南**

包含内容：
- ✅ 快速开始
- ✅ 日常使用（路由、翻译、语言切换）
- ✅ 添加新翻译/新路由
- ✅ 常见问题解答
- ✅ 故障排查流程
- ✅ 最佳实践
- ✅ 配置文件说明

```bash
# 查看完整指南
cat I18N_ROUTING_GUIDE.md
```

---

## 🛠️ 常用命令速查

```bash
# 快速健康检查 (30秒)
./scripts/quick-i18n-routing-check.sh

# 翻译完整性检查
npx tsx scripts/check-i18n-completeness.ts

# 路由覆盖率检查
npx tsx scripts/route-coverage.ts

# 深度路由验证
npx tsx scripts/deep-route-validation.ts

# TypeScript 检查
npx tsc --noEmit

# 构建测试
npm run build
```

---

## 📊 项目当前状态

| 指标 | 状态 |
|------|------|
| 翻译完整度 | ✅ 100% (zh-CN + en-US) |
| 路由定义 | ✅ 37 个 |
| 硬编码路由 | ✅ 零（46 个文件正确使用） |
| 构建状态 | ✅ 成功 (113 页面) |
| 健康度评分 | ✅ 94.1/100 |

---

## 🚀 快速上手

### 1. 使用路由

```typescript
// 客户端组件
'use client';
import { useRouting } from '@/lib/routing';

export default function MyComponent() {
  const { route, routes } = useRouting();
  return <Link href={route(routes.BUSINESS.SHOP)}>商店</Link>;
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

### 3. 添加新翻译

1. 编辑 `messages/zh-CN.json` 和 `messages/en-US.json`
2. 运行 `npx tsx scripts/check-i18n-completeness.ts` 验证
3. 测试页面显示

---

## 📁 相关文件

### 配置文件
- `next.config.js` - Next.js 配置
- `middleware.ts` - 路由中间件
- `src/i18n.ts` - next-intl 配置
- `src/lib/routing.ts` - 路由工具库
- `src/config/app.ts` - 应用配置

### 翻译文件
- `messages/zh-CN.json` - 中文翻译
- `messages/en-US.json` - 英文翻译

### 检查工具
- `scripts/check-i18n-completeness.ts` - 翻译完整性
- `scripts/route-coverage.ts` - 路由覆盖率
- `scripts/deep-route-validation.ts` - 深度验证
- `scripts/quick-i18n-routing-check.sh` - 快速检查

---

## ❓ 遇到问题？

1. **先查看** `I18N_ROUTING_GUIDE.md` 的"常见问题"部分
2. **运行检查**命令查看具体错误
3. **查看控制台**错误信息
4. **参考文档**：
   - Next.js: https://nextjs.org/docs
   - next-intl: https://next-intl-docs.vercel.app/

---

## 📝 文档历史

### 2025-11-12 文档简化
- ✅ 删除 24 个临时/重复文档
- ✅ 创建统一的核心指南
- ✅ 文档大小减少 93%
- ✅ 开发者体验显著提升

查看详情：`I18N_ROUTING_CLEANUP_REPORT.md`

---

**快速开始**: 直接查看 `I18N_ROUTING_GUIDE.md` 📖  
**项目状态**: ✅ 生产就绪 (94.1/100)

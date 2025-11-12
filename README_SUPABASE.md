# Supabase 集成快速参考

> 📚 当前项目 Supabase 集成状态和使用指南

**集成完整度**: 85/100 ✅  
**最后更新**: 2025-11-12

---

## 🎯 集成概览

### 已集成组件

✅ **Supabase Auth** - 用户认证系统  
✅ **Supabase Database** - PostgreSQL 数据库  
✅ **SSR 支持** - 服务端渲染完整支持  
✅ **AuthContext** - 全局认证状态管理  
✅ **API 集成** - 14 个 Supabase 相关端点  

---

## 🚀 快速开始

### 1. 环境变量配置

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
```

### 2. 客户端使用

```typescript
// 浏览器端
import { supabaseBrowser } from '@/lib/auth/supabase-client';

const { data, error } = await supabaseBrowser.auth.signIn({
  email,
  password
});
```

```typescript
// 服务端 (Server Component)
import { createSupabaseServer } from '@/lib/auth/supabase-client';

const supabase = await createSupabaseServer();
const { data: { user } } = await supabase.auth.getUser();
```

### 3. 使用 AuthContext (推荐)

```typescript
'use client';
import { useAuth } from '@/contexts/AuthContext';

export default function MyComponent() {
  const { user, profile, signIn, signOut, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <div>请登录</div>;
  }
  
  return <div>欢迎, {profile?.displayName}</div>;
}
```

---

## 📚 核心文件位置

### 配置文件
| 文件 | 用途 |
|------|------|
| `src/lib/supabase.ts` | 服务端客户端 |
| `src/lib/auth/supabase-client.ts` | 完整客户端配置 |
| `src/lib/supabase-admin.ts` | Admin 客户端 |
| `src/lib/auth/auth-service.ts` | 认证服务类 |
| `src/contexts/AuthContext.tsx` | 全局认证上下文 |

### API 端点
| 端点 | 用途 |
|------|------|
| `/api/test-supabase-auth` | 测试 Supabase 配置 |
| `/api/auth/callback` | OAuth 回调 |
| `/api/auth/verify-email` | 邮箱验证 |
| `/api/admin/users` | 用户管理 |

---

## 🔧 常用操作

### 用户认证

```typescript
import { AuthService } from '@/lib/auth/auth-service';

// 注册
const { user, error } = await AuthService.register({
  email: 'user@example.com',
  password: 'password123',
  firstName: 'John',
  lastName: 'Doe'
});

// 登录
const { session, error } = await AuthService.login({
  email: 'user@example.com',
  password: 'password123'
});

// 登出
await AuthService.logout();

// 重置密码
await AuthService.sendPasswordResetEmail('user@example.com');
```

### 权限检查

```typescript
// 检查权限
const hasPermission = await AuthService.hasPermission(userId, 'manage_users');

// 检查角色
const isAdmin = await AuthService.hasRole(userId, ['ADMIN', 'SUPER_ADMIN']);
```

### 获取用户信息

```typescript
// 获取当前用户
const { user } = await AuthService.getCurrentUser();

// 获取扩展用户信息 (包含 profile)
const extendedUser = await AuthService.getExtendedUser(userId);
```

---

## ⚠️ 已知问题

### 1. Prisma Schema 适配问题

**问题**: Prisma 定义了 `User` 模型，但 Supabase Auth 使用 `auth.users`

**当前解决方案**: 使用 `supabaseId` 字段同步

**建议改进**: 参考 `SUPABASE_FRONTEND_INTEGRATION_REPORT.md` 的方案 A

### 2. 登录页面未使用 AuthContext

**问题**: 直接调用 `/api/auth/login` 而非使用 `useAuth()`

**影响**: 状态更新不及时，需要手动刷新

**修复**: 改用 `const { signIn } = useAuth()`

### 3. 环境变量未标准化

**问题**: 缺少 `.env.example`

**建议**: 创建标准化的环境变量模板

---

## 📊 集成状态

| 功能 | 状态 | 评分 |
|------|------|------|
| 认证系统 | ✅ 完成 | 90/100 |
| 用户管理 | ✅ 完成 | 85/100 |
| 权限系统 | ✅ 完成 | 90/100 |
| 数据库集成 | ⚠️ 部分 | 70/100 |
| 前端组件 | ⚠️ 部分 | 75/100 |

**总体评分**: **85/100** ✅

---

## 🎯 优先级改进建议

### 高优先级 🔴
1. 调整 Prisma Schema，使用 `user_profiles` 表
2. 创建数据库迁移脚本
3. 更新登录页面使用 AuthContext

### 中优先级 🟡
4. 创建 `.env.example`
5. 完善错误处理和国际化
6. 添加单元测试

### 低优先级 🟢
7. 文档完善
8. 性能优化

---

## 🧪 测试与诊断

### 测试 Supabase 配置

```bash
# 访问测试 API
curl http://localhost:3000/api/test-supabase-auth
```

**预期响应**:
```json
{
  "configuration": {
    "validation": { "isValid": true },
    "database": { "connected": true },
    "auth": { "serviceAvailable": true }
  }
}
```

### 检查集成状态

```bash
# 查看 Supabase 使用次数
grep -r "@supabase" src --include="*.tsx" --include="*.ts" | wc -l
# 预期: 52

# 查看 AuthContext 使用
grep -r "useAuth" src/app --include="*.tsx" | wc -l
```

---

## 📖 详细文档

### 完整报告
- **`SUPABASE_FRONTEND_INTEGRATION_REPORT.md`** - 详细的集成检查报告
  - 完整的问题分析
  - 详细的解决方案
  - 数据库 Schema 适配指南
  - 优先级修复建议

### 其他相关文档
- `SUPABASE_INTEGRATION_STATUS.md` - 之前的集成状态
- `SUPABASE_AUTH_COMPLETE.md` - 认证完成报告
- `SUPABASE_AUTH_IMPLEMENTATION.md` - 实现指南

---

## 🔗 有用链接

- [Supabase 官方文档](https://supabase.com/docs)
- [Supabase Auth 文档](https://supabase.com/docs/guides/auth)
- [Next.js + Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)

---

## ❓ 常见问题

### Q: 如何获取当前登录用户？

```typescript
// 方式 1: 使用 AuthContext (推荐)
const { user, profile } = useAuth();

// 方式 2: 直接调用 Supabase
const { data: { user } } = await supabase.auth.getUser();
```

### Q: 如何检查用户权限？

```typescript
// 使用 AuthContext
const { hasRole, isAdmin } = useAuth();

if (hasRole(['ADMIN', 'CREATOR'])) {
  // 允许访问
}

// 或使用 AuthService
const canManage = await AuthService.hasPermission(userId, 'manage_users');
```

### Q: 如何处理认证错误？

```typescript
const { error } = await signIn(email, password);

if (error) {
  // 显示错误消息
  console.error('登录失败:', error.message);
}
```

---

**快速开始**: 查看 `SUPABASE_FRONTEND_INTEGRATION_REPORT.md` 了解详情  
**项目状态**: ✅ 可用 (85/100)  
**建议**: 参考高优先级改进建议进一步优化

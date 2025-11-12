# OpenAero 用户认证系统集成指南

> **状态**: ✅ 已完成集成
> **更新时间**: 2025-11-11

---

## 📋 目录

1. [集成概述](#集成概述)
2. [核心组件](#核心组件)
3. [使用指南](#使用指南)
4. [页面保护](#页面保护)
5. [权限控制](#权限控制)
6. [示例代码](#示例代码)
7. [常见问题](#常见问题)

---

## 1️⃣ 集成概述

### ✅ 已完成的集成

- [x] **AuthContext** - 全局认证状态管理
- [x] **useAuth Hook** - 便捷的认证钩子
- [x] **UserMenu** - 用户菜单组件
- [x] **ProtectedRoute** - 路由保护组件
- [x] **Header 集成** - 顶部导航栏显示用户状态
- [x] **Layout 集成** - 全局 Provider 配置
- [x] **Profile Page** - 用户资料页面

### 🎯 集成特点

- **无缝集成** - 与现有项目完全兼容
- **类型安全** - 完整的 TypeScript 支持
- **自动刷新** - 监听认证状态变化
- **权限控制** - 基于角色的访问控制
- **用户体验** - 流畅的登录/登出体验

---

## 2️⃣ 核心组件

### AuthContext

**位置**: `src/contexts/AuthContext.tsx`

提供全局认证状态和方法:

```typescript
interface AuthContextType {
  user: User | null;                    // Supabase 用户对象
  profile: UserProfile | null;           // 扩展用户资料
  session: Session | null;               // 当前会话
  loading: boolean;                      // 加载状态
  signIn: (email, password) => Promise;  // 登录
  signUp: (email, password, metadata) => Promise; // 注册
  signOut: () => Promise;                // 登出
  refreshProfile: () => Promise;         // 刷新资料
  isAuthenticated: boolean;              // 是否已认证
  hasRole: (role) => boolean;            // 角色检查
  isAdmin: boolean;                      // 是否管理员
  isCreator: boolean;                    // 是否创作者
}
```

### useAuth Hook

**位置**: `src/hooks/useAuth.ts`

简化的认证钩子:

```typescript
const {
  user,
  profile,
  isAuthenticated,
  signIn,
  signOut,
  hasRole,
  isAdmin,
} = useAuth();
```

### UserMenu

**位置**: `src/components/auth/UserMenu.tsx`

用户菜单下拉组件,显示:
- 用户头像和基本信息
- 个人资料、订单、设置链接
- 创作者菜单 (如果是创作者)
- 管理员菜单 (如果是管理员)
- 登出按钮

### ProtectedRoute

**位置**: `src/components/auth/ProtectedRoute.tsx`

路由保护组件:

```typescript
<ProtectedRoute requireAuth={true} requiredRoles={['ADMIN']}>
  <AdminContent />
</ProtectedRoute>
```

---

## 3️⃣ 使用指南

### 在组件中使用认证

#### 基础用法

```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';

export function MyComponent() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return <div>加载中...</div>;
  
  if (!isAuthenticated) {
    return <div>请先登录</div>;
  }

  return (
    <div>
      <h1>欢迎, {user.email}</h1>
    </div>
  );
}
```

#### 获取用户资料

```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';

export function ProfileComponent() {
  const { profile } = useAuth();

  return (
    <div>
      <h2>{profile?.fullName}</h2>
      <p>@{profile?.username}</p>
      <p>角色: {profile?.role}</p>
    </div>
  );
}
```

#### 登录/登出

```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

export function LoginForm() {
  const { signIn, signOut, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    const { error } = await signIn(email, password);
    if (error) {
      console.error('登录失败:', error);
    }
  };

  if (isAuthenticated) {
    return (
      <button onClick={signOut}>
        登出
      </button>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="邮箱"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="密码"
      />
      <button type="submit">登录</button>
    </form>
  );
}
```

---

## 4️⃣ 页面保护

### 使用 ProtectedRoute 组件

#### 基础保护 (需要登录)

```typescript
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function SecurePage() {
  return (
    <ProtectedRoute>
      <div>只有登录用户可见</div>
    </ProtectedRoute>
  );
}
```

#### 基于角色的保护

```typescript
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'SUPER_ADMIN']}>
      <div>只有管理员可见</div>
    </ProtectedRoute>
  );
}
```

#### 创作者页面保护

```typescript
import { CreatorRoute } from '@/components/auth/ProtectedRoute';

export default function CreatorDashboard() {
  return (
    <CreatorRoute>
      <div>创作者仪表板</div>
    </CreatorRoute>
  );
}
```

#### 管理员页面保护

```typescript
import { AdminRoute } from '@/components/auth/ProtectedRoute';

export default function AdminDashboard() {
  return (
    <AdminRoute>
      <div>管理员仪表板</div>
    </AdminRoute>
  );
}
```

#### 自定义重定向

```typescript
<ProtectedRoute 
  requireAuth={true}
  redirectTo="/custom-login"
  fallback={<CustomLoading />}
>
  <SecureContent />
</ProtectedRoute>
```

---

## 5️⃣ 权限控制

### 角色层级

```
SUPER_ADMIN (超级管理员)
    ↓
  ADMIN (管理员)
    ↓
FACTORY_MANAGER (工厂管理员)
    ↓
 REVIEWER (审核员)
    ↓
 CREATOR (创作者)
    ↓
   USER (普通用户)
```

### 角色检查

```typescript
const { hasRole, isAdmin, isCreator } = useAuth();

// 检查单个角色
if (hasRole('ADMIN')) {
  // 管理员逻辑
}

// 检查多个角色
if (hasRole(['ADMIN', 'CREATOR'])) {
  // 管理员或创作者逻辑
}

// 使用便捷属性
if (isAdmin) {
  // 管理员逻辑
}

if (isCreator) {
  // 创作者逻辑
}
```

### 条件渲染

```typescript
const { hasRole } = useAuth();

return (
  <div>
    <h1>仪表板</h1>
    
    {hasRole('USER') && (
      <UserSection />
    )}
    
    {hasRole('CREATOR') && (
      <CreatorSection />
    )}
    
    {hasRole(['ADMIN', 'SUPER_ADMIN']) && (
      <AdminSection />
    )}
  </div>
);
```

---

## 6️⃣ 示例代码

### 完整的登录页面

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function LoginPage() {
  const { signIn, isAuthenticated } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 已登录则重定向
  if (isAuthenticated) {
    router.push('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-center">登录</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-800 p-4 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              邮箱地址
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              密码
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? '登录中...' : '登录'}
          </button>

          <div className="text-center">
            <Link href="/forgot-password" className="text-sm text-primary-600">
              忘记密码?
            </Link>
          </div>

          <div className="text-center">
            <span className="text-sm text-gray-600">还没有账号? </span>
            <Link href="/register" className="text-sm text-primary-600">
              立即注册
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 完整的用户菜单集成

```typescript
// 在 Header 组件中
import { UserMenu } from '@/components/auth/UserMenu';

export function Header() {
  return (
    <header>
      <nav>
        {/* 导航链接 */}
      </nav>
      
      {/* 用户菜单 */}
      <UserMenu />
    </header>
  );
}
```

---

## 7️⃣ 常见问题

### Q1: 如何判断用户是否登录?

```typescript
const { isAuthenticated } = useAuth();

if (isAuthenticated) {
  // 已登录
}
```

### Q2: 如何获取当前用户信息?

```typescript
const { user, profile } = useAuth();

console.log(user.email);          // Supabase 用户邮箱
console.log(profile.fullName);    // 扩展资料 - 姓名
console.log(profile.role);        // 扩展资料 - 角色
```

### Q3: 如何保护整个页面?

使用 `ProtectedRoute` 组件包裹页面内容:

```typescript
export default function SecurePage() {
  return (
    <ProtectedRoute>
      <PageContent />
    </ProtectedRoute>
  );
}
```

### Q4: 如何实现管理员专属功能?

```typescript
const { isAdmin } = useAuth();

return (
  <div>
    {isAdmin && (
      <AdminPanel />
    )}
  </div>
);
```

### Q5: 如何更新用户资料?

```typescript
const { refreshProfile } = useAuth();

// 更新资料后刷新
await fetch('/api/users/me', {
  method: 'PATCH',
  body: JSON.stringify(newData),
});

await refreshProfile();
```

### Q6: 登录后如何重定向?

```typescript
const router = useRouter();
const { signIn } = useAuth();

const handleLogin = async () => {
  const { error } = await signIn(email, password);
  if (!error) {
    router.push('/dashboard');
  }
};
```

### Q7: 如何处理未授权访问?

`ProtectedRoute` 会自动重定向到登录页面。你也可以自定义:

```typescript
<ProtectedRoute redirectTo="/custom-login">
  <SecureContent />
</ProtectedRoute>
```

---

## 📚 相关文档

- **认证系统总览**: `SUPABASE_AUTH_COMPLETE.md`
- **API 文档**: `SUPABASE_AUTH_IMPLEMENTATION.md`
- **测试指南**: `AUTHENTICATION_TESTING_GUIDE.md`
- **SMTP 配置**: `SMTP_CONFIGURATION_STEPS.md`

---

## 🎯 集成检查清单

完成集成后,请确认以下各项:

- [x] ✅ AuthProvider 已添加到 Layout
- [x] ✅ UserMenu 已集成到 Header
- [x] ✅ useAuth Hook 可正常使用
- [x] ✅ ProtectedRoute 组件已创建
- [x] ✅ 用户资料页面已创建
- [ ] ⏳ 登录页面已测试
- [ ] ⏳ 注册页面已测试
- [ ] ⏳ 权限控制已验证
- [ ] ⏳ 路由保护已测试

---

**🎉 集成完成!您的 OpenAero 项目现在拥有完整的用户认证系统!**

*版本: 1.0*  
*最后更新: 2025-11-11*  
*维护者: OpenAero 技术团队*

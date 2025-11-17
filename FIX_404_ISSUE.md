# 🔴 修复邮件验证 404 问题

## 问题分析

你的验证链接：
```
redirect_to=http://localhost:3000/api/auth/callback?next=/welcome
                                                         ^^^^^^^^
                                                         缺少语言前缀！
```

应该是：
```
redirect_to=http://localhost:3000/api/auth/callback?next=/zh-CN/auth/welcome
```

---

## 🎯 快速修复方案（2 步）

### 方案 A：修改 Supabase 配置（推荐）

#### 步骤 1: 在 Supabase Dashboard 设置 Site URL

```
Dashboard → Authentication → URL Configuration
```

**Site URL** 改为：
```
http://localhost:3000/zh-CN
```

**Redirect URLs** 保持：
```
http://localhost:3000/**
http://localhost:3000/api/auth/callback
```

#### 步骤 2: 在 Email Template 中明确指定 redirect

```
Dashboard → Authentication → Email Templates → Confirm signup
```

**在 Confirmation URL 部分**（如果有这个选项），设置为：
```
http://localhost:3000/api/auth/callback?next=/zh-CN/auth/welcome
```

---

### 方案 B：修改回调路由（更灵活）

修改 `src/app/api/auth/callback/route.ts`：

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/auth/supabase-client';

/**
 * 从请求中检测用户语言偏好
 */
function detectUserLocale(request: NextRequest): 'zh-CN' | 'en-US' {
  // 1. 从 next 参数检测
  const next = request.nextUrl.searchParams.get('next');
  if (next) {
    if (next.startsWith('/en-US')) return 'en-US';
    if (next.startsWith('/zh-CN')) return 'zh-CN';
  }

  // 2. 从 Cookie 检测
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  if (localeCookie === 'zh-CN' || localeCookie === 'en-US') {
    return localeCookie;
  }

  // 3. 从 Accept-Language 检测
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage?.includes('zh')) return 'zh-CN';

  // 4. 默认
  return 'zh-CN';
}

export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl;
  const code = requestUrl.searchParams.get('code');
  let next = requestUrl.searchParams.get('next') ?? '/';

  console.log('[Auth Callback] Original next:', next);

  // 🔧 修复：如果 next 不包含语言前缀，自动添加
  if (next && !next.startsWith('/zh-CN') && !next.startsWith('/en-US')) {
    const locale = detectUserLocale(request);
    
    // 修复常见路径
    if (next === '/welcome' || next === '/auth/welcome') {
      next = `/${locale}/auth/welcome`;
    } else if (next === '/' || next === '') {
      next = `/${locale}/auth/welcome`;
    } else if (!next.startsWith('/api')) {
      // 其他路径自动添加语言前缀
      next = `/${locale}${next.startsWith('/') ? next : '/' + next}`;
    }
    
    console.log('[Auth Callback] Fixed next:', next);
  }

  if (code) {
    const supabase = createSupabaseServer();
    
    // 交换 code 获取 session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[Auth Callback] Error:', error);
      const locale = detectUserLocale(request);
      return NextResponse.redirect(
        new URL(`/${locale}/auth/error?message=` + encodeURIComponent(error.message), request.url)
      );
    }

    console.log('[Auth Callback] Session exchanged successfully');
  }

  // 重定向到指定页面
  const redirectUrl = new URL(next, request.url);
  console.log('[Auth Callback] Redirecting to:', redirectUrl.toString());
  
  return NextResponse.redirect(redirectUrl);
}
```

---

## 🚀 立即执行步骤

### 推荐：方案 A + 方案 B 组合

#### 1. 修改 Supabase Site URL
```
Dashboard → Authentication → URL Configuration
Site URL: http://localhost:3000/zh-CN
```

#### 2. 替换回调路由代码
```bash
# 复制上面的代码，替换 src/app/api/auth/callback/route.ts
```

#### 3. 重启开发服务器
```bash
npm run dev
```

#### 4. 测试
```bash
# 1. 清理 cookies
open http://localhost:3000/clear-cookies.html

# 2. 注册新用户
# 访问 http://localhost:3000/zh-CN/auth/register

# 3. 点击邮件验证链接
# 应该正常跳转到 welcome 页面
```

---

## 🔍 调试步骤

### 如果还是 404，检查以下内容：

#### 1. 查看浏览器控制台
```javascript
// 应该看到这些日志
[Auth Callback] Original next: /welcome
[Auth Callback] Fixed next: /zh-CN/auth/welcome
[Auth Callback] Session exchanged successfully
[Auth Callback] Redirecting to: http://localhost:3000/zh-CN/auth/welcome
```

#### 2. 检查 welcome 页面是否存在
```bash
# 确认文件存在
ls -la src/app/\[locale\]/\(auth\)/welcome/page.tsx
```

#### 3. 测试直接访问
```
http://localhost:3000/zh-CN/auth/welcome
# 应该能正常访问（虽然未登录可能看不到内容）
```

#### 4. 检查中间件
```bash
# 查看 middleware.ts
cat middleware.ts

# 确保 /api/auth/callback 不被重定向
```

---

## 🆘 终极修复方案

如果以上方案都不行，使用这个最简单的：

### 创建 `/welcome` 重定向页面

创建 `src/app/welcome/page.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WelcomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    // 自动重定向到带语言前缀的页面
    const locale = document.cookie.match(/NEXT_LOCALE=([^;]+)/)?.[1] || 'zh-CN';
    router.replace(`/${locale}/auth/welcome`);
  }, [router]);

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh' 
    }}>
      <p>Redirecting... / 正在跳转...</p>
    </div>
  );
}
```

这样即使验证链接指向 `/welcome`，也会自动重定向到 `/zh-CN/auth/welcome`。

---

## ✅ 验证成功标准

1. 注册用户后收到邮件
2. 点击邮件中的验证链接
3. **不再出现 404 错误**
4. 自动跳转到 `http://localhost:3000/zh-CN/auth/welcome`
5. 显示欢迎页面，已登录状态

---

## 📝 问题根源

Supabase 邮件模板使用的 `{{ .ConfirmationURL }}` 变量由 Supabase 自动生成，默认使用 Site URL 作为基础。

如果 Site URL 是 `http://localhost:3000`，生成的链接就是：
```
redirect_to=http://localhost:3000/api/auth/callback?next=/welcome
```

但你的应用需要语言前缀，所以需要：
1. 修改 Site URL 为 `http://localhost:3000/zh-CN`，或
2. 在回调路由中自动补全语言前缀

---

立即执行**方案 A + 方案 B**，应该就能解决！🚀

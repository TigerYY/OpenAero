import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateSupabaseSession, handleTokenRefresh, optionalSupabaseAuth } from '@/lib/supabase-auth-middleware';

// 国际化中间件配置
const intlMiddleware = createMiddleware({
  locales: ['zh-CN', 'en-US'],
  defaultLocale: 'zh-CN',
  localePrefix: 'always'
});

// Supabase认证中间件包装器
function withAuth(request: NextRequest) {
  return async (response: NextResponse) => {
    // 跳过认证的路径
    const skipAuthPaths = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/reset-password',
      '/api/auth/session',
      '/_next',
      '/favicon.ico',
      '/api/health'
    ];

    const pathname = request.nextUrl.pathname;
    
    // 如果是跳过认证的路径，直接返回响应
    if (skipAuthPaths.some(path => pathname.startsWith(path))) {
      return response;
    }

    // 对于API路由，进行认证验证
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
      // 尝试自动刷新令牌
      const refreshResult = await handleTokenRefresh(request);
      if (refreshResult) {
        return refreshResult;
      }

      // 验证Supabase会话
      const authResult = await authenticateSupabaseSession(request);
      if (authResult) {
        return authResult;
      }
    }

    // 对于受保护的前端路由，进行可选认证
    const protectedPaths = ['/profile', '/dashboard', '/admin', '/creator'];
    if (protectedPaths.some(path => pathname.includes(path))) {
      const authResult = await optionalSupabaseAuth(request);
      if (authResult) {
        return authResult;
      }
    }

    return response;
  };
}

// 组合中间件
export default async function middleware(request: NextRequest) {
  // 首先应用国际化中间件
  const intlResponse = intlMiddleware(request);
  
  // 如果国际化中间件返回了响应（比如重定向），直接返回
  if (intlResponse && intlResponse.status !== 200) {
    return intlResponse;
  }

  // 应用认证中间件
  const authHandler = withAuth(request);
  return authHandler(intlResponse || NextResponse.next());
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - API auth routes
    // - _next (Next.js internals)
    // - _static (inside /public)
    // - all root files inside /public (e.g. favicon.ico)
    '/((?!api/auth|_next|_static|.*\\..*).*)'
  ]
};

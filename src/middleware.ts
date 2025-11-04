import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 简化中间件，暂时移除认证检查以避免 openid-client 错误
// 使用简单的会话检查而不是完整的auth()调用

// 需要认证的路由
const authRoutes = [
  '/profile',
  '/creators/dashboard',
  '/creators/apply',
  '/admin'
]

// 公开路由（不需要认证）
const publicRoutes = [
  '/auth/login',
  '/auth/register',
  '/auth/verify-email',
  '/auth/forgot-password',
  '/auth/reset-password'
]

// API路由认证检查
const apiAuthRoutes = [
  '/api/profile',
  '/api/creators',
  '/api/admin'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 暂时禁用认证检查，避免 openid-client 错误
  // 检查是否为API路由
  if (pathname.startsWith('/api/')) {
    // API认证检查 - 暂时禁用
    // for (const route of apiAuthRoutes) {
    //   if (pathname.startsWith(route)) {
    //     const session = await auth()
    //     
    //     if (!session) {
    //       return NextResponse.json(
    //         { error: 'Unauthorized' },
    //         { status: 401 }
    //       )
    //     }
    //     
    //     // 检查用户角色权限
    //     if (pathname.startsWith('/api/admin') && session.user.role !== 'ADMIN') {
    //       return NextResponse.json(
    //         { error: 'Forbidden' },
    //         { status: 403 }
    //       )
    //     }
    //     
    //     break
    //   }
    // }
  } else {
    // 页面路由认证检查 - 暂时禁用
    
    // 检查是否为公开路由
    const isPublicRoute = publicRoutes.some(route => 
      pathname.startsWith(route)
    )
    
    if (isPublicRoute) {
      return NextResponse.next()
    }
    
    // 检查是否需要认证 - 暂时禁用
    // const requiresAuth = authRoutes.some(route => 
    //   pathname.startsWith(route)
    // )
    // 
    // if (requiresAuth) {
    //   const session = await auth()
    //   
    //   if (!session) {
    //     // 重定向到登录页面
    //     const loginUrl = new URL('/auth/login', request.url)
    //     loginUrl.searchParams.set('callbackUrl', pathname)
    //     return NextResponse.redirect(loginUrl)
    //   }
    //   
    //   // 检查管理员权限
    //   if (pathname.startsWith('/admin') && session.user.role !== 'ADMIN') {
    //     return NextResponse.redirect(new URL('/unauthorized', request.url))
    //   }
    //   
    //   // 检查创作者权限
    //   if (pathname.startsWith('/creators/dashboard') && session.user.role !== 'CREATOR') {
    //     return NextResponse.redirect(new URL('/creators/apply', request.url))
    //   }
    // }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
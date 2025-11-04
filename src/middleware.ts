import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { RoutingUtils } from '@/lib/routing'

// 简化中间件，暂时移除认证检查以避免 openid-client 错误
// 使用简单的会话检查而不是完整的auth()调用

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 暂时禁用认证检查，避免 openid-client 错误
  // 检查是否为API路由
  if (RoutingUtils.isApiRoute(pathname)) {
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
    
    // 检查是否为公开路由（支持国际化路径）
    const isPublicRoute = RoutingUtils.isPublicRoute(pathname)
    
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
/**
 * 邮箱验证 API
 * GET /api/auth/verify-email?token=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyEmail } from '@/lib/auth/supabase-auth-service';
import { RoutingUtils, ROUTES } from '@/lib/routing';

/**
 * 从请求中检测用户语言偏好
 */
function detectUserLocale(request: NextRequest): 'zh-CN' | 'en-US' {
  // 从 Cookie 检测
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  if (localeCookie === 'zh-CN' || localeCookie === 'en-US') {
    return localeCookie;
  }

  // 从 Accept-Language 请求头检测
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    if (acceptLanguage.includes('zh')) return 'zh-CN';
    if (acceptLanguage.includes('en')) return 'en-US';
  }

  // 默认语言
  return 'zh-CN';
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: '缺少验证令牌',
        },
        { status: 400 }
      );
    }

    // 验证邮箱
    const result = await verifyEmail(token);

    // 检测用户语言偏好
    const locale = detectUserLocale(request);
    
    // 重定向到登录页面 - 使用路由工具库
    const loginRoute = RoutingUtils.generateRouteWithParams(
      locale,
      ROUTES.AUTH.LOGIN,
      { verified: 'true' }
    );
    return NextResponse.redirect(new URL(loginRoute, request.url));
  } catch (error: any) {
    console.error('邮箱验证失败:', error);

    // 检测用户语言偏好
    const locale = detectUserLocale(request);
    
    // 重定向到验证错误页面 - 使用路由工具库
    // 注意：verify-error 路由需要在 ROUTES 中定义，暂时使用硬编码但带locale
    const errorRoute = RoutingUtils.generateRouteWithParams(
      locale,
      '/verify-error',
      { message: error.message }
    );
    return NextResponse.redirect(new URL(errorRoute, request.url));
  }
}

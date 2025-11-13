import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  // 支持的语言列表
  locales: ['zh-CN', 'en-US'],
  
  // 默认语言
  defaultLocale: 'zh-CN',
  
  // 语言前缀策略：always 表示所有语言都需要前缀
  localePrefix: 'always',
  
  // 本地化检测：从URL路径检测语言
  localeDetection: true
});

export default function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  
  // 如果路径不包含 locale 前缀，且不是根路径，先手动重定向
  if (
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/_next/') &&
    !pathname.startsWith('/_static/') &&
    !pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf|eot)$/) &&
    !pathname.startsWith('/zh-CN/') &&
    !pathname.startsWith('/en-US/') &&
    pathname !== '/' &&
    pathname !== '/zh-CN' &&
    pathname !== '/en-US'
  ) {
    // 重定向到默认 locale
    const defaultLocale = 'zh-CN';
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname}`;
    // 保留查询参数
    if (search) {
      url.search = search;
    }
    return NextResponse.redirect(url);
  }
  
  // 让 next-intl 中间件处理其他逻辑
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // 匹配所有路径，除了：
    // - API 路由 (/api/...)
    // - Next.js 内部文件 (_next/...)
    // - 静态文件 (.*\..*)
    '/((?!api|_next|_static|.*\\..*).*)'
  ]
};

import createMiddleware from 'next-intl/middleware';

// 国际化中间件配置
const intlMiddleware = createMiddleware({
  locales: ['zh-CN', 'en-US'],
  defaultLocale: 'zh-CN',
  localePrefix: 'always'
});

// 简化的中间件 - 仅处理国际化
export default async function middleware(request: NextRequest) {
  // 直接应用国际化中间件
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - _next (Next.js internals)
    // - _static (inside /public)
    // - all root files inside /public (e.g. favicon.ico)
    '/((?!_next|_static|.*\\..*).*)'
  ]
};

import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // 支持的语言列表
  locales: ['zh-CN', 'en-US'],
  
  // 默认语言
  defaultLocale: 'zh-CN',
  
  // 语言前缀策略：as-needed 表示默认语言不需要前缀
  localePrefix: 'as-needed',
  
  // 本地化检测：从URL路径检测语言
  localeDetection: true
});

export const config = {
  matcher: [
    // Match all pathnames except for
    // - _next (Next.js internals)
    // - _static (inside /public)
    // - all root files inside /public (e.g. favicon.ico)
    '/((?!_next|_static|.*\\..*).*)'
  ]
};

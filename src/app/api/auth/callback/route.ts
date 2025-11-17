/**
 * Auth 回调处理 API
 * GET /api/auth/callback
 * 处理邮箱验证、密码重置等回调
 * 支持国际化（zh-CN, en-US）
 */

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

  // 3. 从 Accept-Language 请求头检测
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    if (acceptLanguage.includes('zh')) return 'zh-CN';
    if (acceptLanguage.includes('en')) return 'en-US';
  }

  // 4. 默认语言
  return 'zh-CN';
}

export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl;
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');
  let next = requestUrl.searchParams.get('next') ?? '/';

  console.log('[Auth Callback] 收到回调请求:', {
    code: code ? 'exists' : 'missing',
    error: error || 'none',
    originalNext: next
  });

  // 处理 Supabase 返回的错误
  if (error) {
    console.error('[Auth Callback] Supabase 返回错误:', error, error_description);
    const locale = detectUserLocale(request);
    const message = error_description || error;
    return NextResponse.redirect(
      new URL(`/${locale}/auth/register?error=${encodeURIComponent(message)}`, request.url)
    );
  }

  // 🔧 修复：如果 next 不包含语言前缀，自动添加
  if (next && !next.startsWith('/zh-CN') && !next.startsWith('/en-US')) {
    const locale = detectUserLocale(request);
    
    console.log('[Auth Callback] 检测到的语言:', locale);
    
    // 修复常见路径
    if (next === '/welcome' || next === '/auth/welcome') {
      next = `/${locale}/welcome`;
      console.log('[Auth Callback] 修复 welcome 路径:', next);
    } else if (next === '/' || next === '') {
      next = `/${locale}/welcome`;
      console.log('[Auth Callback] 默认跳转到 welcome:', next);
    } else if (!next.startsWith('/api')) {
      // 其他路径自动添加语言前缀
      next = `/${locale}${next.startsWith('/') ? next : '/' + next}`;
      console.log('[Auth Callback] 添加语言前缀:', next);
    }
  }

  if (code) {
    const supabase = await createSupabaseServer();
    
    // 交换 code 获取 session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[Auth Callback] Code 交换失败:', error);
      const locale = detectUserLocale(request);
      
      // 重定向到注册页面并显示错误
      return NextResponse.redirect(
        new URL(`/${locale}/auth/register?error=` + encodeURIComponent(error.message), request.url)
      );
    }

    console.log('[Auth Callback] Session 交换成功，用户:', data?.user?.id);
  }

  // 重定向到指定页面
  const redirectUrl = new URL(next, request.url);
  console.log('[Auth Callback] 重定向到:', redirectUrl.toString());
  
  return NextResponse.redirect(redirectUrl);
}

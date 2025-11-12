/**
 * Auth 回调处理 API
 * GET /api/auth/callback
 * 处理邮箱验证、密码重置等回调
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/auth/supabase-client';

export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl;
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/';

  if (code) {
    const supabase = createSupabaseServer();
    
    // 交换 code 获取 session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(
        new URL('/auth/error?message=' + encodeURIComponent(error.message), request.url)
      );
    }
  }

  // 重定向到指定页面或首页
  return NextResponse.redirect(new URL(next, request.url));
}

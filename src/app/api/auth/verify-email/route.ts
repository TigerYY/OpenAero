/**
 * 邮箱验证 API
 * GET /api/auth/verify-email?token=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyEmail } from '@/lib/auth/supabase-auth-service';

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

    // 重定向到登录页面
    return NextResponse.redirect(
      new URL('/auth/login?verified=true', request.url)
    );
  } catch (error: any) {
    console.error('邮箱验证失败:', error);

    return NextResponse.redirect(
      new URL(`/auth/verify-error?message=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}

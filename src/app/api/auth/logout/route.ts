/**
 * 用户登出 API
 * POST /api/auth/logout
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService, getServerUser } from '@/lib/auth/auth-service';

export async function POST(request: NextRequest) {
  try {
    // 获取当前用户
    const user = await getServerUser();

    // 登出
    const { error } = await AuthService.logout();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // 记录审计日志
    if (user) {
      await AuthService.logAudit({
        user_id: user.id,
        action: 'USER_LOGOUT',
        resource: 'auth',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '0.0.0.0',
        user_agent: request.headers.get('user-agent') || 'Unknown',
      });
    }

    return NextResponse.json({
      success: true,
      message: '登出成功',
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    
    return NextResponse.json(
      { error: '登出失败，请稍后重试' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';

import { logUserAction, getClientIP } from '../../../../backend/auth/auth.middleware';
import { AuthService } from '../../../../backend/auth/auth.service';
import { PasswordResetConfirm } from '../../../../shared/types';

const authService = new AuthService();

export async function POST(request: NextRequest) {
  let body: PasswordResetConfirm | null = null;
  
  try {
    body = await request.json();

    // 验证必填字段
    if (!body || !body.token || !body.newPassword) {
      return NextResponse.json(
        { error: '重置令牌和新密码为必填项' },
        { status: 400 }
      );
    }

    // 验证密码强度
    if (body.newPassword.length < 8) {
      return NextResponse.json(
        { error: '密码长度至少为8位' },
        { status: 400 }
      );
    }

    // 重置密码
    await authService.resetPassword(body);

    // 记录审计日志
    await logUserAction(
      'anonymous',
      'PASSWORD_RESET_SUCCESS',
      'user',
      undefined,
      undefined,
      { resetTime: new Date().toISOString() },
      getClientIP(request),
      request.headers.get('user-agent') || undefined
    );

    return NextResponse.json({
      success: true,
      message: '密码重置成功，请使用新密码登录'
    });

  } catch (error: any) {
    console.error('Reset password error:', error);

    // 记录失败的密码重置
    await logUserAction(
      'anonymous',
      'PASSWORD_RESET_FAILED',
      'user',
      undefined,
      undefined,
      { reason: error.message },
      getClientIP(request),
      request.headers.get('user-agent') || undefined
    );

    if (error.message.includes('无效或已过期的重置令牌')) {
      return NextResponse.json(
        { error: '重置令牌无效或已过期，请重新申请密码重置' },
        { status: 400 }
      );
    }

    if (error.message.includes('重置令牌已被使用')) {
      return NextResponse.json(
        { error: '重置令牌已被使用，请重新申请密码重置' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '密码重置失败，请稍后重试' },
      { status: 500 }
    );
  }
}
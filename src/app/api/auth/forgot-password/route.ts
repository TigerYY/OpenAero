import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../backend/auth/auth.service';
import { PasswordResetRequest } from '../../../../shared/types';
import { logUserAction, getClientIP } from '../../../../backend/auth/auth.middleware';

const authService = new AuthService();

export async function POST(request: NextRequest) {
  let body: PasswordResetRequest | null = null;
  
  try {
    body = await request.json();

    // 验证必填字段
    if (!body || !body.email) {
      return NextResponse.json(
        { error: '邮箱为必填项' },
        { status: 400 }
      );
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: '邮箱格式无效' },
        { status: 400 }
      );
    }

    // 发送密码重置邮件
    await authService.forgotPassword(body);

    // 记录审计日志（不记录具体邮箱以保护隐私）
    await logUserAction(
      'anonymous',
      'PASSWORD_RESET_REQUEST',
      'user',
      undefined,
      undefined,
      { requestTime: new Date().toISOString() },
      getClientIP(request),
      request.headers.get('user-agent') || undefined
    );

    return NextResponse.json({
      success: true,
      message: '如果该邮箱已注册，您将收到密码重置邮件'
    });

  } catch (error: any) {
    console.error('Forgot password error:', error);

    // 记录失败的密码重置请求
    await logUserAction(
      'anonymous',
      'PASSWORD_RESET_REQUEST_FAILED',
      'user',
      undefined,
      undefined,
      { email: body?.email, reason: 'system_error' },
      getClientIP(request),
      request.headers.get('user-agent') || undefined
    );

    return NextResponse.json(
      { error: '密码重置请求失败，请稍后重试' },
      { status: 500 }
    );
  }
}
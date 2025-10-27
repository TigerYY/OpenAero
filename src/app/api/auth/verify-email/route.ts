import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../backend/auth/auth.service';
import { EmailVerificationRequest } from '../../../../shared/types';
import { logUserAction, getClientIP } from '../../../../backend/auth/auth.middleware';

const authService = new AuthService();

export async function POST(request: NextRequest) {
  let body: EmailVerificationRequest | null = null;
  
  try {
    body = await request.json();

    // 验证必填字段
    if (!body || !body.token) {
      return NextResponse.json(
        { error: '验证令牌为必填项' },
        { status: 400 }
      );
    }

    // 验证邮箱
    await authService.verifyEmail(body);

    // 记录审计日志
    await logUserAction(
      'anonymous',
      'EMAIL_VERIFICATION_SUCCESS',
      'user',
      undefined,
      undefined,
      { verificationTime: new Date().toISOString() },
      getClientIP(request),
      request.headers.get('user-agent') || undefined
    );

    return NextResponse.json({
      success: true,
      message: '邮箱验证成功'
    });

  } catch (error: any) {
    console.error('Email verification error:', error);

    // 记录失败的邮箱验证
    await logUserAction(
      'anonymous',
      'EMAIL_VERIFICATION_FAILED',
      'user',
      undefined,
      undefined,
      { reason: error.message },
      getClientIP(request),
      request.headers.get('user-agent') || undefined
    );

    if (error.message.includes('无效或已过期的验证令牌')) {
      return NextResponse.json(
        { error: '验证令牌无效或已过期' },
        { status: 400 }
      );
    }

    if (error.message.includes('验证令牌已被使用')) {
      return NextResponse.json(
        { error: '验证令牌已被使用' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '邮箱验证失败，请稍后重试' },
      { status: 500 }
    );
  }
}
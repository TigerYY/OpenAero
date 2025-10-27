import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../backend/auth/auth.service';
import { LoginRequest } from '../../../../shared/types';
import { logUserAction, getClientIP } from '../../../../backend/auth/auth.middleware';

const authService = new AuthService();

export async function POST(request: NextRequest) {
  let body: LoginRequest | null = null;
  
  try {
    body = await request.json();

    // 验证必填字段
    if (!body || !body.email || !body.password) {
      return NextResponse.json(
        { error: '邮箱和密码为必填项' },
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

    // 用户登录
    const result = await authService.login(body);

    // 记录审计日志
    await logUserAction(
      result.user.id,
      'USER_LOGIN',
      'user',
      result.user.id,
      undefined,
      { loginTime: new Date().toISOString() },
      getClientIP(request),
      request.headers.get('user-agent') || undefined
    );

    // 返回结果（不包含敏感信息）
    const { user, tokens } = result;
    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.createdAt
    };

    return NextResponse.json({
      success: true,
      data: {
        user: safeUser,
        tokens
      },
      message: '登录成功'
    });

  } catch (error: any) {
    console.error('Login error:', error);

    // 记录失败的登录尝试
    if (error.message.includes('邮箱或密码错误')) {
      // 不记录具体的用户ID，因为可能是恶意尝试
      await logUserAction(
        'anonymous',
        'LOGIN_FAILED',
        'user',
        undefined,
        undefined,
        { email: body?.email, reason: 'invalid_credentials' },
        getClientIP(request),
        request.headers.get('user-agent') || undefined
      );

      return NextResponse.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}
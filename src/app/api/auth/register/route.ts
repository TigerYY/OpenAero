import { NextRequest, NextResponse } from 'next/server';

import { logUserAction, getClientIP } from '../../../../backend/auth/auth.middleware';
import { AuthService } from '../../../../backend/auth/auth.service';
import { RegisterRequest } from '../../../../shared/types';

const authService = new AuthService();

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();

    // 验证必填字段
    if (!body.email || !body.password || !body.name) {
      return NextResponse.json(
        { error: '邮箱、密码和姓名为必填项' },
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

    // 验证密码强度
    if (body.password.length < 8) {
      return NextResponse.json(
        { error: '密码长度至少为8位' },
        { status: 400 }
      );
    }

    // 注册用户
    const result = await authService.register(body);

    // 记录审计日志
    await logUserAction(
      result.user.id,
      'USER_REGISTER',
      'user',
      result.user.id,
      undefined,
      { email: result.user.email, name: result.user.name },
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
      message: '注册成功，请查收邮箱验证邮件'
    });

  } catch (error: any) {
    console.error('Registration error:', error);

    // 记录错误日志
    if (error.message.includes('邮箱已被注册')) {
      return NextResponse.json(
        { error: '该邮箱已被注册，请使用其他邮箱或尝试登录' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}
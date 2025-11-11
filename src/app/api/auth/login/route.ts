/**
 * 用户登录 API
 * POST /api/auth/login
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { z } from 'zod';

// 登录请求验证 schema
const loginSchema = z.object({
  email: z.string().email('无效的邮箱地址'),
  password: z.string().min(1, '密码不能为空'),
});

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();

    // 验证输入
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // 登录
    const { session, error } = await AuthService.login({ email, password });

    if (error) {
      // 记录失败的登录尝试
      await AuthService.logAudit({
        action: 'USER_LOGIN_FAILED',
        resource: 'auth',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '0.0.0.0',
        user_agent: request.headers.get('user-agent') || 'Unknown',
        metadata: { email },
        success: false,
        error_message: error.message,
      });

      // 处理常见错误
      if (error.message.includes('Invalid login credentials')) {
        return NextResponse.json(
          { error: '邮箱或密码错误' },
          { status: 401 }
        );
      }

      if (error.message.includes('Email not confirmed')) {
        return NextResponse.json(
          { error: '请先验证您的邮箱地址' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // 记录成功的登录
    await AuthService.logAudit({
      user_id: session?.user.id,
      action: 'USER_LOGIN',
      resource: 'auth',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '0.0.0.0',
      user_agent: request.headers.get('user-agent') || 'Unknown',
      metadata: { email },
    });

    return NextResponse.json({
      success: true,
      message: '登录成功',
      session: {
        access_token: session?.access_token,
        refresh_token: session?.refresh_token,
        expires_at: session?.expires_at,
      },
      user: {
        id: session?.user.id,
        email: session?.user.email,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}

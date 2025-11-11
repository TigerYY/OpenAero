/**
 * 用户注册 API
 * POST /api/auth/register
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { z } from 'zod';

// 注册请求验证 schema
const registerSchema = z.object({
  email: z.string().email('无效的邮箱地址'),
  password: z
    .string()
    .min(8, '密码至少8个字符')
    .regex(/[A-Z]/, '密码必须包含大写字母')
    .regex(/[a-z]/, '密码必须包含小写字母')
    .regex(/[0-9]/, '密码必须包含数字'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  displayName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();

    // 验证输入
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, password, firstName, lastName, displayName } = validationResult.data;

    // 注册用户
    const { user, error } = await AuthService.register({
      email,
      password,
      firstName,
      lastName,
      displayName,
    });

    if (error) {
      // 处理常见错误
      if (error.message.includes('already registered')) {
        return NextResponse.json(
          { error: '该邮箱已被注册' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // 记录审计日志
    await AuthService.logAudit({
      user_id: user?.id,
      action: 'USER_REGISTER',
      resource: 'auth',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '0.0.0.0',
      user_agent: request.headers.get('user-agent') || 'Unknown',
      metadata: { email },
    });

    return NextResponse.json({
      success: true,
      message: '注册成功！请查收邮箱验证邮件',
      user: {
        id: user?.id,
        email: user?.email,
      },
    });
  } catch (error: any) {
    console.error('Register error:', error);
    
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}

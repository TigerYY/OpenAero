/**
 * 忘记密码 API
 * POST /api/auth/forgot-password
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { z } from 'zod';

// 忘记密码请求验证 schema
const forgotPasswordSchema = z.object({
  email: z.string().email('无效的邮箱地址'),
});

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();

    // 验证输入
    const validationResult = forgotPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;

    // 发送密码重置邮件
    const { error } = await AuthService.sendPasswordResetEmail(email);

    if (error) {
      // 出于安全考虑，即使邮箱不存在也返回成功消息
      // 但记录错误到审计日志
      await AuthService.logAudit({
        action: 'PASSWORD_RESET_REQUEST_FAILED',
        resource: 'auth',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '0.0.0.0',
        user_agent: request.headers.get('user-agent') || 'Unknown',
        metadata: { email },
        success: false,
        error_message: error.message,
      });
    } else {
      // 记录成功的密码重置请求
      await AuthService.logAudit({
        action: 'PASSWORD_RESET_REQUEST',
        resource: 'auth',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '0.0.0.0',
        user_agent: request.headers.get('user-agent') || 'Unknown',
        metadata: { email },
      });
    }

    // 始终返回成功消息（安全最佳实践）
    return NextResponse.json({
      success: true,
      message: '如果该邮箱已注册，我们已发送密码重置链接到您的邮箱',
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    
    return NextResponse.json(
      { error: '请求失败，请稍后重试' },
      { status: 500 }
    );
  }
}

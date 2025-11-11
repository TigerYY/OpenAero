/**
 * 重置密码 API
 * POST /api/auth/reset-password
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService, getServerUser } from '@/lib/auth/auth-service';
import { z } from 'zod';

// 重置密码请求验证 schema
const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, '密码至少8个字符')
    .regex(/[A-Z]/, '密码必须包含大写字母')
    .regex(/[a-z]/, '密码必须包含小写字母')
    .regex(/[0-9]/, '密码必须包含数字'),
});

export async function POST(request: NextRequest) {
  try {
    // 获取当前用户（必须通过密码重置链接访问）
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    // 解析请求体
    const body = await request.json();

    // 验证输入
    const validationResult = resetPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { password } = validationResult.data;

    // 重置密码
    const { error } = await AuthService.resetPassword(password);

    if (error) {
      await AuthService.logAudit({
        user_id: user.id,
        action: 'PASSWORD_RESET_FAILED',
        resource: 'auth',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '0.0.0.0',
        user_agent: request.headers.get('user-agent') || 'Unknown',
        success: false,
        error_message: error.message,
      });

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // 记录成功的密码重置
    await AuthService.logAudit({
      user_id: user.id,
      action: 'PASSWORD_RESET',
      resource: 'auth',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '0.0.0.0',
      user_agent: request.headers.get('user-agent') || 'Unknown',
    });

    return NextResponse.json({
      success: true,
      message: '密码重置成功，请使用新密码登录',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    
    return NextResponse.json(
      { error: '密码重置失败，请稍后重试' },
      { status: 500 }
    );
  }
}

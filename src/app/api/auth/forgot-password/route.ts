/**
 * 忘记密码 API
 * POST /api/auth/forgot-password
 */

import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { z } from 'zod';
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  logAuditAction,
} from '@/lib/api-helpers';

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
      return createValidationErrorResponse(validationResult.error);
    }

    const { email } = validationResult.data;

    // 发送密码重置邮件
    const { error } = await AuthService.sendPasswordResetEmail(email);

    if (error) {
      // 出于安全考虑，即使邮箱不存在也返回成功消息
      // 但记录错误到审计日志
      await logAuditAction(request, {
        action: 'PASSWORD_RESET_REQUEST_FAILED',
        resource: 'auth',
        metadata: { email },
        success: false,
        errorMessage: error.message,
      });
    } else {
      // 记录成功的密码重置请求
      await logAuditAction(request, {
        action: 'PASSWORD_RESET_REQUEST',
        resource: 'auth',
        metadata: { email },
      });
    }

    // 始终返回成功消息（安全最佳实践）
    return createSuccessResponse(
      null,
      '如果该邮箱已注册，我们已发送密码重置链接到您的邮箱。链接有效期为1小时。'
    );
  } catch (error: unknown) {
    console.error('Forgot password error:', error);
    return createErrorResponse(
      '请求失败，请稍后重试',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

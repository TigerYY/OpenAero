/**
 * 重置密码 API
 * POST /api/auth/reset-password
 */

import { NextRequest } from 'next/server';
import { AuthService, getServerUser } from '@/lib/auth/auth-service';
import { z } from 'zod';
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  logAuditAction,
} from '@/lib/api-helpers';
import { InputSanitizer } from '@/lib/security';

// 重置密码请求验证 schema
// 使用与 InputSanitizer.validatePassword 一致的规则
const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, '密码至少8个字符')
    .regex(/[a-z]/, '密码必须包含小写字母')
    .regex(/[A-Z]/, '密码必须包含大写字母')
    .regex(/\d/, '密码必须包含数字')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, '密码必须包含特殊字符'),
});

export async function POST(request: NextRequest) {
  try {
    // 获取当前用户（必须通过密码重置链接访问）
    const user = await getServerUser();

    if (!user) {
      return createErrorResponse('未授权访问，请使用有效的密码重置链接', 401);
    }

    // 解析请求体
    const body = await request.json();

    // 验证输入
    const validationResult = resetPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const { password } = validationResult.data;

    // 使用 InputSanitizer 进行额外的密码强度验证
    const passwordValidation = InputSanitizer.validatePassword(password);
    if (!passwordValidation.isValid || passwordValidation.score < 4) {
      return createErrorResponse(
        '密码强度不足，请确保密码包含大小写字母、数字和特殊字符',
        400
      );
    }

    // 重置密码
    const { error } = await AuthService.resetPassword(password);

    if (error) {
      await logAuditAction(request, {
        action: 'PASSWORD_RESET_FAILED',
        resource: 'auth',
        resource_id: user.id,
        metadata: { userId: user.id },
        success: false,
        errorMessage: error.message,
      });

      return createErrorResponse(
        `密码重置失败: ${error.message}`,
        400
      );
    }

    // 记录成功的密码重置
    await logAuditAction(request, {
      action: 'PASSWORD_RESET_SUCCESS',
      resource: 'auth',
      resource_id: user.id,
      metadata: { userId: user.id },
    });

    return createSuccessResponse(
      null,
      '密码重置成功，请使用新密码登录'
    );
  } catch (error: unknown) {
    console.error('Reset password error:', error);
    return createErrorResponse(
      '密码重置失败，请稍后重试',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

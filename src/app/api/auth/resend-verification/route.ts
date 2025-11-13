/**
 * 重新发送邮箱验证邮件 API
 * POST /api/auth/resend-verification
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

// 重新发送验证邮件请求验证 schema
const resendVerificationSchema = z.object({
  email: z.string().email('无效的邮箱地址'),
});

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();

    // 验证输入
    const validationResult = resendVerificationSchema.safeParse(body);
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const { email } = validationResult.data;

    // 发送验证邮件
    const { error } = await AuthService.sendEmailVerification(email);

    if (error) {
      // 记录失败的请求
      await logAuditAction(request, {
        action: 'RESEND_VERIFICATION_FAILED',
        resource: 'auth',
        metadata: { email },
        success: false,
        errorMessage: error.message,
      });

      // 处理常见错误
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        // 出于安全考虑，即使邮箱不存在也返回成功消息
        return createSuccessResponse(
          null,
          '如果该邮箱已注册，验证邮件已发送，请查收'
        );
      }

      if (error.message.includes('already confirmed') || error.message.includes('already verified')) {
        return createErrorResponse('该邮箱已验证，无需重新发送', 400);
      }

      return createErrorResponse(error.message, 400);
    }

    // 记录成功的请求
    await logAuditAction(request, {
      action: 'RESEND_VERIFICATION',
      resource: 'auth',
      metadata: { email },
    });

    // 出于安全考虑，始终返回成功消息
    return createSuccessResponse(
      null,
      '如果该邮箱已注册，验证邮件已发送，请查收'
    );
  } catch (error: unknown) {
    console.error('Resend verification error:', error);
    
    return createErrorResponse(
      '发送验证邮件失败，请稍后重试',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}


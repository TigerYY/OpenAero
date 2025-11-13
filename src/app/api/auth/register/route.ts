/**
 * 用户注册 API
 * POST /api/auth/register
 */

import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { z } from 'zod';
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  logAuditAction,
  getRequestIp,
  getRequestUserAgent,
} from '@/lib/api-helpers';

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
      return createValidationErrorResponse(validationResult.error);
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
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        await logAuditAction(request, {
          action: 'USER_REGISTER_FAILED',
          resource: 'auth',
          metadata: { email, reason: 'email_already_exists' },
          success: false,
          errorMessage: error.message,
        });

        return createErrorResponse('该邮箱已被注册', 409);
      }

      await logAuditAction(request, {
        action: 'USER_REGISTER_FAILED',
        resource: 'auth',
        metadata: { email },
        success: false,
        errorMessage: error.message,
      });

      return createErrorResponse(error.message, 400);
    }

    // 记录审计日志
    await logAuditAction(request, {
      userId: user?.id,
      action: 'USER_REGISTER',
      resource: 'auth',
      metadata: { email },
    });

    return createSuccessResponse(
      {
        id: user?.id,
        email: user?.email,
      },
      '注册成功！请查收邮箱验证邮件',
      201
    );
  } catch (error: unknown) {
    console.error('Register error:', error);
    
    return createErrorResponse(
      '注册失败，请稍后重试',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

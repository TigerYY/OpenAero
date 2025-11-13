/**
 * 用户密码修改 API
 * POST /api/users/password - 修改用户密码
 */

import { NextRequest } from 'next/server';
import { getServerUser } from '@/lib/auth/auth-service';
import { AuthService } from '@/lib/auth/auth-service';
import { createSupabaseServer } from '@/lib/auth/supabase-client';
import { z } from 'zod';
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  logAuditAction,
} from '@/lib/api-helpers';

// 密码修改验证 schema
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '请输入当前密码'),
  newPassword: z.string().min(8, '新密码至少8个字符'),
});

/**
 * POST - 修改用户密码
 */
export async function POST(request: NextRequest) {
  try {
    // 获取当前用户
    const user = await getServerUser();
    if (!user) {
      return createErrorResponse('未授权访问', 401);
    }

    // 解析请求体
    const body = await request.json();

    // 验证输入
    const validationResult = changePasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const { currentPassword, newPassword } = validationResult.data;

    // 验证当前密码
    const supabase = await createSupabaseServer();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (signInError) {
      // 记录失败审计日志
      await logAuditAction(request, {
        action: 'CHANGE_PASSWORD_FAILED',
        resource: 'auth.users',
        resource_id: user.id,
        metadata: {
          reason: 'invalid_current_password',
        },
        success: false,
        errorMessage: '当前密码错误',
      });

      return createErrorResponse('当前密码错误', 400);
    }

    // 验证新密码强度
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return createErrorResponse(passwordValidation.error || '密码强度不足', 400);
    }

    // 更新密码
    const { error: updateError } = await AuthService.updatePassword(newPassword);

    if (updateError) {
      await logAuditAction(request, {
        action: 'CHANGE_PASSWORD_FAILED',
        resource: 'auth.users',
        resource_id: user.id,
        metadata: {
          reason: 'update_failed',
        },
        success: false,
        errorMessage: updateError.message,
      });

      return createErrorResponse('密码修改失败', 500);
    }

    // 记录审计日志
    await logAuditAction(request, {
      action: 'CHANGE_PASSWORD',
      resource: 'auth.users',
      resource_id: user.id,
      metadata: {
        // 不记录密码本身
        passwordChanged: true,
      },
    });

    return createSuccessResponse(null, '密码修改成功，请重新登录');
  } catch (error: unknown) {
    console.error('修改密码异常:', error);
    return createErrorResponse(
      '密码修改失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

/**
 * 验证密码强度
 */
function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: '密码长度至少8个字符' };
  }

  if (password.length > 128) {
    return { valid: false, error: '密码长度不能超过128个字符' };
  }

  // 检查是否包含大小写字母、数字和特殊字符
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const strengthScore = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;

  if (strengthScore < 3) {
    return {
      valid: false,
      error: '密码强度不足，请包含大小写字母、数字和特殊字符中的至少3种',
    };
  }

  return { valid: true };
}


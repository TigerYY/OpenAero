/**
 * 用户账户删除 API
 * POST /api/users/delete - 软删除用户账户
 */

import { NextRequest } from 'next/server';
import { getServerUser } from '@/lib/auth/auth-service';
import { createSupabaseServer } from '@/lib/auth/supabase-client';
import { z } from 'zod';
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  logAuditAction,
} from '@/lib/api-helpers';

// 账户删除验证 schema
const deleteAccountSchema = z.object({
  password: z.string().min(1, '请输入密码以确认删除'),
  confirmText: z.literal('DELETE', {
    errorMap: () => ({ message: '请输入 DELETE 以确认删除' }),
  }),
});

/**
 * POST - 删除用户账户（软删除）
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
    const validationResult = deleteAccountSchema.safeParse(body);
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const { password, confirmText } = validationResult.data;

    // 验证密码
    const supabase = await createSupabaseServer();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    });

    if (signInError) {
      // 记录失败审计日志
      await logAuditAction(request, {
        action: 'DELETE_ACCOUNT_FAILED',
        resource: 'user_profiles',
        resource_id: user.id,
        metadata: {
          reason: 'invalid_password',
        },
        success: false,
        errorMessage: '密码错误',
      });

      return createErrorResponse('密码错误，无法删除账户', 400);
    }

    // 软删除：更新 user_profiles 状态为 DELETED
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        status: 'DELETED',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      await logAuditAction(request, {
        action: 'DELETE_ACCOUNT_FAILED',
        resource: 'user_profiles',
        resource_id: user.id,
        metadata: {
          reason: 'update_failed',
        },
        success: false,
        errorMessage: updateError.message,
      });

      return createErrorResponse('删除账户失败', 500);
    }

    // 记录审计日志
    await logAuditAction(request, {
      action: 'DELETE_ACCOUNT',
      resource: 'user_profiles',
      resource_id: user.id,
      metadata: {
        deletedAt: new Date().toISOString(),
      },
    });

    // 登出用户
    await supabase.auth.signOut();

    return createSuccessResponse(null, '账户已删除');
  } catch (error: unknown) {
    console.error('删除账户异常:', error);
    return createErrorResponse(
      '删除账户失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}


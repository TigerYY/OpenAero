/**
 * 邮箱修改 API
 * POST /api/users/email/change - 请求修改邮箱（需要密码验证）
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  logAuditAction,
} from '@/lib/api-helpers';
import { getServerUser } from '@/lib/auth/auth-service';
import { createSupabaseServer } from '@/lib/auth/supabase-client';
import { isValidEmail } from '@/lib/utils';

// 请求 schema
const changeEmailSchema = z.object({
  newEmail: z.string().email('无效的邮箱地址'),
  password: z.string().min(1, '密码不能为空'),
});

/**
 * POST - 请求修改邮箱
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
    const validationResult = changeEmailSchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const { newEmail, password } = validationResult.data;

    // 验证邮箱格式
    if (!isValidEmail(newEmail)) {
      return createErrorResponse('无效的邮箱地址', 400);
    }

    // 检查新邮箱是否与当前邮箱相同
    if (newEmail === user.email) {
      return createErrorResponse('新邮箱不能与当前邮箱相同', 400);
    }

    // 验证用户密码
    const supabase = await createSupabaseServer();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: password,
    });

    if (signInError) {
      await logAuditAction(request, {
        userId: user.id,
        action: 'CHANGE_EMAIL_FAILED',
        resource: 'auth',
        metadata: {
          reason: '密码不正确',
          newEmail,
        },
        success: false,
        errorMessage: signInError.message,
      });
      return createErrorResponse('密码不正确', 400);
    }

    // 检查新邮箱是否已被其他用户使用
    // 注意：Supabase 的 updateUser 会自动检查邮箱是否已被使用
    // 这里先尝试更新，如果失败再处理错误

    // 发送邮箱修改验证邮件到新邮箱
    // Supabase 的 updateUser 方法会发送验证邮件到新邮箱
    // 用户需要点击邮件中的链接来确认邮箱变更
    const { error: updateError } = await supabase.auth.updateUser({
      email: newEmail,
    });

    if (updateError) {
      console.error('发送邮箱修改验证邮件失败:', updateError);
      
      // 检查是否是邮箱已被使用的错误
      if (updateError.message.includes('already registered') || 
          updateError.message.includes('already exists') ||
          updateError.message.includes('User already registered')) {
        await logAuditAction(request, {
          userId: user.id,
          action: 'CHANGE_EMAIL_FAILED',
          resource: 'auth',
          metadata: {
            reason: '邮箱已被使用',
            newEmail,
          },
          success: false,
          errorMessage: updateError.message,
        });
        return createErrorResponse('该邮箱已被其他用户使用', 400);
      }

      await logAuditAction(request, {
        userId: user.id,
        action: 'CHANGE_EMAIL_FAILED',
        resource: 'auth',
        metadata: {
          reason: '发送验证邮件失败',
          newEmail,
        },
        success: false,
        errorMessage: updateError.message,
      });
      return createErrorResponse(`发送验证邮件失败: ${updateError.message}`, 500);
    }

    // 记录审计日志
    await logAuditAction(request, {
      userId: user.id,
      action: 'CHANGE_EMAIL_REQUESTED',
      resource: 'auth',
      metadata: {
        oldEmail: user.email,
        newEmail,
      },
    });

    return createSuccessResponse(
      {
        newEmail,
        message: '验证邮件已发送到新邮箱，请查收并点击链接确认',
      },
      '验证邮件已发送到新邮箱，请查收并点击链接确认邮箱修改'
    );
  } catch (error: unknown) {
    console.error('Change email error:', error);
    return createErrorResponse(
      '修改邮箱失败，请稍后重试',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}


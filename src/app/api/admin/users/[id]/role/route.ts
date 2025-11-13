/**
 * 用户角色管理 API (管理员)
 * PATCH /api/admin/users/[id]/role - 更新用户角色
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  requireAdminAuth,
  logAuditAction,
} from '@/lib/api-helpers';
import { createSupabaseServer } from '@/lib/auth/supabase-client';

// 用户角色枚举
const UserRole = {
  USER: 'USER',
  CREATOR: 'CREATOR',
  REVIEWER: 'REVIEWER',
  FACTORY_MANAGER: 'FACTORY_MANAGER',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

// 请求 schema
const updateRoleSchema = z.object({
  role: z.enum(['USER', 'CREATOR', 'REVIEWER', 'FACTORY_MANAGER', 'ADMIN', 'SUPER_ADMIN']),
  reason: z.string().optional(), // 角色变更原因
});

/**
 * PATCH - 更新用户角色
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证管理员权限
    const authResult = await requireAdminAuth(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const adminUser = authResult.user;
    const userId = params.id;

    // 解析请求体
    const body = await request.json();
    const validationResult = updateRoleSchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const { role, reason } = validationResult.data;

    // 获取当前用户信息
    const supabase = await createSupabaseServer();
    const { data: currentProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, email')
      .eq('user_id', userId)
      .single();

    if (profileError || !currentProfile) {
      return createErrorResponse('用户不存在', 404);
    }

    const oldRole = currentProfile.role;

    // 防止非超级管理员修改超级管理员角色
    if (currentProfile.role === 'SUPER_ADMIN' && adminUser.role !== 'SUPER_ADMIN') {
      return createErrorResponse('无权修改超级管理员角色', 403);
    }

    // 防止非超级管理员将用户设置为超级管理员
    if (role === 'SUPER_ADMIN' && adminUser.role !== 'SUPER_ADMIN') {
      return createErrorResponse('无权将用户设置为超级管理员', 403);
    }

    // 防止修改自己的角色（除非是超级管理员）
    if (userId === adminUser.id && adminUser.role !== 'SUPER_ADMIN') {
      return createErrorResponse('不能修改自己的角色', 400);
    }

    // 更新用户角色
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        role,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('更新用户角色失败:', updateError);
      await logAuditAction(request, {
        userId: adminUser.id,
        action: 'UPDATE_USER_ROLE_FAILED',
        resource: 'user_profiles',
        resourceId: userId,
        metadata: {
          userId,
          oldRole,
          newRole: role,
          reason,
        },
        success: false,
        errorMessage: updateError.message,
      });

      return createErrorResponse(`更新用户角色失败: ${updateError.message}`, 500);
    }

    // 记录审计日志
    await logAuditAction(request, {
      userId: adminUser.id,
      action: 'UPDATE_USER_ROLE',
      resource: 'user_profiles',
      resourceId: userId,
      oldValue: { role: oldRole },
      newValue: { role, reason },
      metadata: {
        userId,
        oldRole,
        newRole: role,
        reason,
        userEmail: currentProfile.email,
      },
    });

    // TODO: 发送角色变更通知邮件
    // await sendRoleChangeNotification(userId, role, reason);

    return createSuccessResponse(
      {
        userId,
        oldRole,
        newRole: role,
      },
      `用户角色已更新为 ${role}`
    );
  } catch (error: unknown) {
    console.error('Update user role error:', error);
    return createErrorResponse(
      '更新用户角色失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}


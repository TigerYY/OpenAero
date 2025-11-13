/**
 * 批量操作用户 API (管理员)
 * POST /api/admin/users/batch - 批量操作用户
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  requireAdminAuth,
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  logAuditAction,
} from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { createSupabaseServer } from '@/lib/auth/supabase-client';
import { createSupabaseAdmin } from '@/lib/auth/supabase-client';

export const dynamic = 'force-dynamic';

const batchActionSchema = z.object({
  userIds: z.array(z.string()).min(1, '至少选择一个用户'),
  action: z.enum(['role', 'status']),
  value: z.string().min(1, '操作值不能为空'),
  reason: z.string().optional(),
});

/**
 * POST - 批量操作用户
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await requireAdminAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }

    const adminUser = authResult.user;

    // 解析请求体
    const body = await request.json();
    const validationResult = batchActionSchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const { userIds, action, value, reason } = validationResult.data;

    // 验证操作值
    if (action === 'role') {
      const validRoles = ['USER', 'CREATOR', 'REVIEWER', 'FACTORY_MANAGER', 'ADMIN', 'SUPER_ADMIN'];
      if (!validRoles.includes(value)) {
        return createErrorResponse('无效的角色值', 400);
      }

      // 防止非超级管理员设置超级管理员角色
      if (value === 'SUPER_ADMIN' && adminUser.role !== 'SUPER_ADMIN') {
        return createErrorResponse('无权将用户设置为超级管理员', 403);
      }
    } else if (action === 'status') {
      const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED'];
      if (!validStatuses.includes(value)) {
        return createErrorResponse('无效的状态值', 400);
      }

      // 防止删除或暂停自己
      if (userIds.includes(adminUser.id) && (value === 'DELETED' || value === 'SUSPENDED')) {
        return createErrorResponse('不能删除或暂停自己的账户', 400);
      }
    }

    // 获取要操作的用户信息
    const users = await prisma.userProfile.findMany({
      where: {
        user_id: { in: userIds },
      },
      select: {
        user_id: true,
        role: true,
        status: true,
      },
    });

    if (users.length !== userIds.length) {
      return createErrorResponse('部分用户不存在', 404);
    }

    // 检查权限：防止非超级管理员修改超级管理员
    if (action === 'role' || action === 'status') {
      const hasSuperAdmin = users.some((u) => u.role === 'SUPER_ADMIN');
      if (hasSuperAdmin && adminUser.role !== 'SUPER_ADMIN') {
        return createErrorResponse('无权修改超级管理员', 403);
      }
    }

    const supabase = await createSupabaseServer();
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (action === 'role') {
      updateData.role = value;
    } else if (action === 'status') {
      updateData.status = value;
      if (value === 'SUSPENDED') {
        updateData.is_blocked = true;
        updateData.blocked_reason = reason || '账户已被管理员批量暂停';
        updateData.blocked_at = new Date().toISOString();
      } else if (value === 'ACTIVE') {
        updateData.is_blocked = false;
        updateData.blocked_reason = null;
        updateData.blocked_at = null;
      }
    }

    // 批量更新用户
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update(updateData)
      .in('user_id', userIds);

    if (updateError) {
      console.error('批量更新用户失败:', updateError);
      await logAuditAction(request, {
        userId: adminUser.id,
        action: 'BATCH_UPDATE_USERS_FAILED',
        resource: 'user_profiles',
        metadata: {
          userIds,
          action,
          value,
          reason,
        },
        success: false,
        errorMessage: updateError.message,
      });

      return createErrorResponse(`批量更新用户失败: ${updateError.message}`, 500);
    }

    // 如果状态变更为 SUSPENDED 或 DELETED，需要使这些用户的所有会话失效
    if (action === 'status' && (value === 'SUSPENDED' || value === 'DELETED')) {
      try {
        const supabaseAdmin = createSupabaseAdmin();
        // 批量使会话失效
        for (const userId of userIds) {
          const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(userId);
          if (signOutError) {
            console.error(`使用户 ${userId} 会话失效失败:`, signOutError);
            // 不阻止批量更新，只记录错误
          }
        }
      } catch (signOutErr) {
        console.error('批量使用户会话失效异常:', signOutErr);
        // 不阻止批量更新，只记录错误
      }
    }

    // 记录审计日志
    await logAuditAction(request, {
      userId: adminUser.id,
      action: 'BATCH_UPDATE_USERS',
      resource: 'user_profiles',
      metadata: {
        userIds,
        action,
        value,
        reason,
        count: userIds.length,
      },
    });

    return createSuccessResponse(
      {
        affectedCount: userIds.length,
        action,
        value,
      },
      `成功批量操作 ${userIds.length} 个用户`
    );
  } catch (error) {
    console.error('批量操作用户失败:', error);
    return createErrorResponse(
      '批量操作用户失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}


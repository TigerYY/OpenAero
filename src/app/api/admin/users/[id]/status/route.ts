/**
 * 用户状态管理 API (管理员)
 * PATCH /api/admin/users/[id]/status - 更新用户状态
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
import { createSupabaseAdmin } from '@/lib/auth/supabase-client';
import { sendStatusChangeNotification } from '@/lib/email/smtp-service';

// 用户状态枚举
const UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  DELETED: 'DELETED',
} as const;

type UserStatusType = typeof UserStatus[keyof typeof UserStatus];

// 请求 schema
const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED']),
  reason: z.string().optional(), // 状态变更原因
});

/**
 * PATCH - 更新用户状态
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
    const validationResult = updateStatusSchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const { status, reason } = validationResult.data;

    // 获取当前用户信息
    const supabase = await createSupabaseServer();
    const { data: currentProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('status, roles, role, email, display_name, first_name, last_name')
      .eq('user_id', userId)
      .single();

    if (profileError || !currentProfile) {
      return createErrorResponse('用户不存在', 404);
    }

    // 统一使用 roles 数组进行权限检查
    const currentUserRoles = Array.isArray(currentProfile.roles) 
      ? currentProfile.roles 
      : (currentProfile.role ? [currentProfile.role] : []);
    const adminRoles = Array.isArray(adminUser.roles) 
      ? adminUser.roles 
      : (adminUser.role ? [adminUser.role] : []);

    // 防止修改超级管理员状态（除非是其他超级管理员）
    if (currentUserRoles.includes('SUPER_ADMIN') && !adminRoles.includes('SUPER_ADMIN')) {
      return createErrorResponse('无权修改超级管理员状态', 403);
    }

    // 防止删除或暂停自己
    if (userId === adminUser.id && (status === 'DELETED' || status === 'SUSPENDED')) {
      return createErrorResponse('不能删除或暂停自己的账户', 400);
    }

    const oldStatus = currentProfile.status;

    // 更新用户状态
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...(status === 'SUSPENDED' && {
          is_blocked: true,
          blocked_reason: reason || '账户已被管理员暂停',
          blocked_at: new Date().toISOString(),
        }),
        ...(status === 'ACTIVE' && {
          is_blocked: false,
          blocked_reason: null,
          blocked_at: null,
        }),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('更新用户状态失败:', updateError);
      await logAuditAction(request, {
        userId: adminUser.id,
        action: 'UPDATE_USER_STATUS_FAILED',
        resource: 'user_profiles',
        resourceId: userId,
        metadata: {
          userId,
          oldStatus,
          newStatus: status,
          reason,
        },
        success: false,
        errorMessage: updateError.message,
      });

      return createErrorResponse(`更新用户状态失败: ${updateError.message}`, 500);
    }

    // 如果状态变更为 SUSPENDED 或 DELETED，需要使该用户的所有会话失效
    if (status === 'SUSPENDED' || status === 'DELETED') {
      try {
        const supabaseAdmin = createSupabaseAdmin();
        // 使用 Supabase Admin API 使所有会话失效
        // 注意：Supabase Admin API 的 signOut 方法签名可能不同，需要根据实际API调整
        const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(userId);
        if (signOutError) {
          console.error('使用户会话失效失败:', signOutError);
          // 不阻止状态更新，只记录错误
        }
      } catch (signOutErr) {
        console.error('使用户会话失效异常:', signOutErr);
        // 不阻止状态更新，只记录错误
      }
    }

    // 记录审计日志
    await logAuditAction(request, {
      userId: adminUser.id,
      action: 'UPDATE_USER_STATUS',
      resource: 'user_profiles',
      resourceId: userId,
      oldValue: { status: oldStatus },
      newValue: { status, reason },
      metadata: {
        userId,
        oldStatus,
        newStatus: status,
        reason,
        userEmail: currentProfile.email,
      },
    });

    // 发送状态变更通知邮件
    try {
      const userName = currentProfile.display_name || 
                      (currentProfile.first_name && currentProfile.last_name 
                        ? `${currentProfile.first_name} ${currentProfile.last_name}` 
                        : currentProfile.email?.split('@')[0] || '用户');
      
      await sendStatusChangeNotification(
        currentProfile.email || '',
        userName,
        status,
        oldStatus,
        reason
      );
      console.log(`[用户状态变更] 已发送通知邮件给用户: ${currentProfile.email}`);
    } catch (emailError) {
      // 邮件发送失败不影响状态更新，只记录错误
      console.error('[用户状态变更] 发送通知邮件失败:', emailError);
    }

    return createSuccessResponse(
      {
        userId,
        oldStatus,
        newStatus: status,
      },
      `用户状态已更新为 ${status}`
    );
  } catch (error: unknown) {
    console.error('Update user status error:', error);
    return createErrorResponse(
      '更新用户状态失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}


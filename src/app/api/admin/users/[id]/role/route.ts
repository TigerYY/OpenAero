/**
 * 用户角色管理 API (管理员)
 * PATCH /api/admin/users/[id]/role - 更新用户角色
 */

import {
  createErrorResponse,
  createSuccessResponse,
  createValidationErrorResponse,
  logAuditAction,
  requireAdminAuth,
} from '@/lib/api-helpers';
import { createSupabaseAdmin } from '@/lib/auth/supabase-client';
import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const prisma = new PrismaClient();

// ... (zod schemas remain the same)

// 请求 schema（支持多角色）
const updateRoleSchema = z.object({
  roles: z.array(z.enum(['USER', 'CREATOR', 'REVIEWER', 'FACTORY_MANAGER', 'ADMIN', 'SUPER_ADMIN']))
    .min(1, '至少需要选择一个角色'),
  role: z.enum(['USER', 'CREATOR', 'REVIEWER', 'FACTORY_MANAGER', 'ADMIN', 'SUPER_ADMIN']).optional(), // 向后兼容
  reason: z.string().optional(),
});


export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[PATCH /users/[id]/role] 开始处理角色更新请求, userId:', params.id);
    
    const authResult = await requireAdminAuth(request);
    if (!authResult.success) {
      console.log('[PATCH /users/[id]/role] 认证失败:', authResult.response?.status);
      return authResult.response;
    }

    const adminUser = authResult.user;
    const userId = params.id;
    
    console.log('[PATCH /users/[id]/role] 认证成功:', {
      adminId: adminUser.id,
      adminRoles: adminUser.roles,
      targetUserId: userId
    });

    const body = await request.json();
    console.log('[PATCH /users/[id]/role] 请求体:', body);
    
    const validationResult = updateRoleSchema.safeParse(body);

    if (!validationResult.success) {
      console.log('[PATCH /users/[id]/role] 验证失败:', validationResult.error.errors);
      return createValidationErrorResponse(validationResult.error);
    }

    const { roles, role, reason } = validationResult.data;
    const rolesToSet = roles || (role ? [role] : []);
    
    console.log('[PATCH /users/[id]/role] 解析后的角色:', {
      roles,
      role,
      rolesToSet,
      reason
    });
    
    const supabase = createSupabaseAdmin();

    // 1. 从 Supabase Auth 获取权威用户信息
    const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(userId);
    if (authUserError || !authUser) {
      return createErrorResponse('目标用户在认证系统中不存在', 404);
    }

    // 2. 获取现有的 Profile (如果存在)
    const existingProfile = await prisma.userProfile.findUnique({
      where: { user_id: userId },
      select: { roles: true },
    });
    
    const oldRoles = existingProfile ? (Array.isArray(existingProfile.roles) ? existingProfile.roles : []) : [];
    const adminRoles = adminUser.roles || (adminUser.role ? [adminUser.role] : []);
    
    // 3. 权限检查
    if (oldRoles.includes('SUPER_ADMIN') && !adminRoles.includes('SUPER_ADMIN')) {
      console.warn('[PATCH /users/[id]/role] 无权修改超级管理员角色:', {
        targetUserId: userId,
        oldRoles,
        adminRoles
      });
      return createErrorResponse('无权修改超级管理员角色', 403);
    }
    if (rolesToSet.includes('SUPER_ADMIN') && !adminRoles.includes('SUPER_ADMIN')) {
      console.warn('[PATCH /users/[id]/role] 无权将用户设置为超级管理员:', {
        targetUserId: userId,
        newRoles: rolesToSet,
        adminRoles
      });
      return createErrorResponse('无权将用户设置为超级管理员', 403);
    }
    if (userId === adminUser.id && !adminRoles.includes('SUPER_ADMIN')) {
      console.warn('[PATCH /users/[id]/role] 不能修改自己的角色:', {
        targetUserId: userId,
        adminId: adminUser.id,
        adminRoles
      });
      return createErrorResponse('不能修改自己的角色', 400);
    }

    // 4. 执行 Upsert 操作
    await prisma.userProfile.upsert({
      where: { user_id: userId },
      update: {
        roles: rolesToSet,
        updated_at: new Date(),
      },
      create: {
        user_id: userId,
        display_name: authUser.user.email?.split('@')[0] || `User ${userId.slice(0, 8)}`,
        roles: rolesToSet,
        permissions: [],
        status: 'ACTIVE',
      },
    });

    // 5. 记录审计日志
    await logAuditAction(request, {
      userId: adminUser.id,
      action: existingProfile ? 'UPDATE_USER_ROLE' : 'CREATE_USER_PROFILE_AND_SET_ROLE',
      resource: 'user_profiles',
      resourceId: userId,
      oldValue: { roles: oldRoles },
      newValue: { roles: rolesToSet },
      metadata: { reason, userEmail: authUser.user.email },
    });

    return createSuccessResponse(
      { userId, oldRoles, newRoles: rolesToSet },
      `用户角色已成功更新`
    );

  } catch (error: unknown) {
    console.error('[PATCH /users/[id]/role] 更新用户角色时出错:', error);
    const errorDetails = error instanceof Error 
      ? { name: error.name, message: error.message, stack: error.stack } 
      : { error: String(error) };
    console.error('[PATCH /users/[id]/role] 错误详情:', errorDetails);
    return createErrorResponse(
      '更新用户角色失败',
      500,
      errorDetails
    );
  }
}



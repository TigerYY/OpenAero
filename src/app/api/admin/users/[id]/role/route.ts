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
import { PrismaClient } from '@prisma/client';

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
    const authResult = await requireAdminAuth(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const adminUser = authResult.user;
    const userId = params.id;

    const body = await request.json();
    const validationResult = updateRoleSchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const { roles, role, reason } = validationResult.data;
    const rolesToSet = roles || (role ? [role] : []);
    
    const supabase = await createSupabaseServer();

    // 1. 从 Supabase Auth 获取权威用户信息
    const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(userId);
    if (authUserError || !authUser) {
      return createErrorResponse('目标用户在认证系统中不存在', 404);
    }

    // 2. 获取现有的 Profile (如果存在)
    const existingProfile = await prisma.user_profile.findUnique({
      where: { user_id: userId },
      select: { roles: true, role: true },
    });
    
    const oldRoles = existingProfile ? (Array.isArray(existingProfile.roles) ? existingProfile.roles : (existingProfile.role ? [existingProfile.role] : [])) : [];
    const adminRoles = adminUser.roles || (adminUser.role ? [adminUser.role] : []);
    
    // 3. 权限检查
    if (oldRoles.includes('SUPER_ADMIN') && !adminRoles.includes('SUPER_ADMIN')) {
      return createErrorResponse('无权修改超级管理员角色', 403);
    }
    if (rolesToSet.includes('SUPER_ADMIN') && !adminRoles.includes('SUPER_ADMIN')) {
      return createErrorResponse('无权将用户设置为超级管理员', 403);
    }
    if (userId === adminUser.id && !adminRoles.includes('SUPER_ADMIN')) {
      return createErrorResponse('不能修改自己的角色', 400);
    }

    // 4. 执行 Upsert 操作
    const updatedProfile = await prisma.user_profile.upsert({
      where: { user_id: userId },
      update: {
        roles: rolesToSet,
        updated_at: new Date(),
      },
      create: {
        user_id: userId,
        email: authUser.user.email, // 从 Auth 用户信息中获取 Email
        roles: rolesToSet,
        // 根据需要填充其他默认值
        // first_name: '', 
        // last_name: '',
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
    console.error('更新用户角色时出错:', error);
    return createErrorResponse(
      '更新用户角色失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}



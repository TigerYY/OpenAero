
/**
 * 特定用户管理 API (管理员)
 * GET /api/admin/users/[id] - 获取单个用户信息
 * PUT /api/admin/users/[id] - 更新用户信息
 * DELETE /api/admin/users/[id] - 删除用户
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

// 请求 schema
const updateUserSchema = z.object({
  firstName: z.string().min(1, '名字不能为空').max(50, '名字不能超过50个字符').optional(),
  lastName: z.string().min(1, '姓氏不能为空').max(50, '姓氏不能超过50个字符').optional(),
  // 其他可以更新的字段
}).refine(
  (data) => {
    // 至少要有一个字段被更新
    return data.firstName !== undefined || data.lastName !== undefined;
  },
  {
    message: '至少需要提供一个要更新的字段',
    path: ['root']
  }
);

/**
 * GET - 获取单个用户信息
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // ... (未来可以实现)
  return createErrorResponse('方法未实现', 501);
}

/**
 * PUT - 更新用户信息
 */
export async function PUT(
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
    const validationResult = updateUserSchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const { firstName, lastName } = validationResult.data;
    
    console.log('[PUT /users/[id]] 开始更新用户信息:', {
      userId,
      firstName,
      lastName,
      adminId: adminUser.id
    });

    // 检查用户是否存在，使用 upsert 确保兼容性
    let updatedProfile;
    try {
      updatedProfile = await prisma.user_profile.update({
        where: { user_id: userId },
        data: {
          first_name: firstName,
          last_name: lastName,
          updated_at: new Date(),
        },
      });
      console.log('[PUT /users/[id]] 更新现有 profile 成功');
    } catch (updateError: any) {
      if (updateError.code === 'P2025') {
        // Profile 不存在，创建新的
        console.log('[PUT /users/[id]] Profile 不存在，创建新 profile');
        
        // 从 Supabase Auth 获取用户邮箱
        const supabase = await createSupabaseServer();
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
        
        if (authError || !authUser?.user) {
          console.error('[PUT /users/[id]] 无法获取认证用户信息:', authError);
          return createErrorResponse('用户不存在于认证系统中', 404);
        }
        
        try {
          updatedProfile = await prisma.user_profile.create({
            data: {
              user_id: userId,
              email: authUser.user.email,
              first_name: firstName,
              last_name: lastName,
              roles: ['USER'], // 默认角色
              status: 'ACTIVE',
              created_at: new Date(),
              updated_at: new Date(),
            },
          });
          console.log('[PUT /users/[id]] 创建新 profile 成功');
        } catch (createError: any) {
          console.error('[PUT /users/[id]] 创建 profile 失败:', createError);
          return createErrorResponse('创建用户资料失败: ' + createError.message, 500);
        }
      } else {
        console.error('[PUT /users/[id]] 更新 profile 失败:', updateError);
        return createErrorResponse('更新用户资料失败: ' + updateError.message, 500);
      }
    }

    // 更新 Supabase Auth (如果需要)
    // 注意: Supabase Auth 的 user_metadata 更新可能需要特殊处理
    const supabase = await createSupabaseServer();
    const { data: authUser, error: authError } = await supabase.auth.admin.updateUserById(
      userId,
      { user_metadata: { first_name: firstName, last_name: lastName } }
    );

    if (authError) {
      // 即便 auth 更新失败，profile 已更新，可以只记录错误，不阻断流程
      console.error('更新 Supabase Auth 用户元数据失败:', authError);
      await logAuditAction(request, {
        userId: adminUser.id,
        action: 'UPDATE_USER_AUTH_METADATA_FAILED',
        resource: 'auth.users',
        resourceId: userId,
        success: false,
        errorMessage: authError.message,
      });
    }
    
    await logAuditAction(request, {
      userId: adminUser.id,
      action: 'UPDATE_USER',
      resource: 'user_profiles',
      resourceId: userId,
      newValue: { firstName, lastName },
    });

    return createSuccessResponse(updatedProfile, '用户信息更新成功');

  } catch (error: unknown) {
    console.error('Update user error:', error);
    const errorMessage = error instanceof Error ? error.message : '更新用户信息时发生未知错误';
    return createErrorResponse(errorMessage, 500);
  }
}

/**
 * DELETE - 删除用户
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id:string } }
) {
  // ... (已在其他地方实现，或未来实现)
  return createErrorResponse('方法未实现', 501);
}

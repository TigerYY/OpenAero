/**
 * 更新用户角色 API (管理员)
 * PATCH /api/admin/users/:id/role
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updateUserRole } from '@/lib/auth/supabase-auth-service';
import { UserRole } from '@prisma/client';

// 请求 schema
const updateRoleSchema = z.object({
  role: z.nativeEnum(UserRole),
  adminId: z.string(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    const body = await request.json();

    // 验证请求数据
    const { role, adminId } = updateRoleSchema.parse(body);

    // 更新用户角色
    const result = await updateUserRole(userId, role, adminId);

    return NextResponse.json({
      success: true,
      message: '用户角色更新成功',
      data: result.user,
    });
  } catch (error: any) {
    console.error('更新用户角色失败:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          message: '请求数据格式错误',
          errors: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error.message || '更新角色失败',
      },
      { status: 403 }
    );
  }
}

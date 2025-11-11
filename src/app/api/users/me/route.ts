/**
 * 当前用户信息 API
 * GET /api/users/me - 获取当前用户信息
 * PATCH /api/users/me - 更新当前用户信息
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService, getServerUser, getServerExtendedUser } from '@/lib/auth/auth-service';
import { z } from 'zod';

// 更新用户信息验证 schema
const updateProfileSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  display_name: z.string().optional(),
  bio: z.string().optional(),
  avatar: z.string().url().optional(),
});

/**
 * GET - 获取当前用户信息
 */
export async function GET() {
  try {
    // 获取当前用户
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    // 获取扩展用户信息
    const extendedUser = await getServerExtendedUser();

    if (!extendedUser) {
      return NextResponse.json(
        { error: '用户信息不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: extendedUser,
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    
    return NextResponse.json(
      { error: '获取用户信息失败' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - 更新当前用户信息
 */
export async function PATCH(request: NextRequest) {
  try {
    // 获取当前用户
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    // 解析请求体
    const body = await request.json();

    // 验证输入
    const validationResult = updateProfileSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const updates = validationResult.data;

    // 更新用户资料
    const { error } = await AuthService.updateProfile(user.id, updates);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // 记录审计日志
    await AuthService.logAudit({
      user_id: user.id,
      action: 'UPDATE_PROFILE',
      resource: 'user_profiles',
      resource_id: user.id,
      new_value: updates,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '0.0.0.0',
      user_agent: request.headers.get('user-agent') || 'Unknown',
    });

    // 获取更新后的用户信息
    const updatedUser = await AuthService.getExtendedUser(user.id);

    return NextResponse.json({
      success: true,
      message: '用户信息更新成功',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    
    return NextResponse.json(
      { error: '更新用户信息失败' },
      { status: 500 }
    );
  }
}

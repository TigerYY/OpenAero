import { NextRequest, NextResponse } from 'next/server';

import { authenticateSupabaseSession, getClientIP } from '@/lib/supabase-auth-middleware';

// 获取用户资料
export async function GET(request: NextRequest) {
  try {
    // 验证Supabase会话
    const authResult = await authenticateSupabaseSession(request);
    if (authResult) {
      return authResult; // 返回认证错误
    }

    // 获取用户信息
    const user = (request as any).user;

    // 从Supabase用户信息和本地数据库获取完整资料
    const { prisma } = await import('@/lib/prisma');
    const profile = await prisma.user.findUnique({
      where: { email: user.email },
      include: {
        creatorProfile: true
      }
    });

    // 返回用户资料（不包含敏感信息）
    const safeProfile = {
      id: profile?.id || user.userId,
      email: profile?.email || user.email,
      firstName: profile?.firstName || user.user?.user_metadata?.first_name || '',
      lastName: profile?.lastName || user.user?.user_metadata?.last_name || '',
      name: profile?.name || `${user.user?.user_metadata?.first_name || ''} ${user.user?.user_metadata?.last_name || ''}`.trim(),
      avatar: profile?.avatar || user.user?.user_metadata?.avatar || '',
      role: profile?.role || user.role,
      createdAt: profile?.createdAt || user.user?.created_at
    };

    return NextResponse.json({
      success: true,
      data: safeProfile
    });

  } catch (error: any) {
    console.error('Get profile error:', error);

    return NextResponse.json(
      { error: '获取用户资料失败' },
      { status: 500 }
    );
  }
}

// 更新用户资料
export async function PUT(request: NextRequest) {
  let body: any = null;
  
  try {
    // 验证用户身份
    const authResult = await authenticateToken(request);
    if (authResult) {
      return authResult; // 返回认证错误
    }

    // 获取用户信息
    const user = (request as any).user;

    body = await request.json();

    // 验证更新数据
    const allowedFields = ['name', 'avatar'];
    const updateData: any = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: '没有提供有效的更新字段' },
        { status: 400 }
      );
    }

    // 更新用户资料
    const updatedProfile = await authService.updateProfile(user.userId, updateData);

    // 记录审计日志
    await logUserAction(
      user.userId,
      'PROFILE_UPDATE',
      'user',
      user.userId,
      undefined,
      { updatedFields: Object.keys(updateData) },
      getClientIP(request),
      request.headers.get('user-agent') || undefined
    );

    // 返回更新后的用户资料（不包含敏感信息）
    const safeProfile = {
      id: updatedProfile.id,
      email: updatedProfile.email,
      name: updatedProfile.name,
      avatar: updatedProfile.avatar,
      role: updatedProfile.role,
      createdAt: updatedProfile.createdAt
    };

    return NextResponse.json({
      success: true,
      data: safeProfile,
      message: '用户资料更新成功'
    });

  } catch (error: any) {
    console.error('Update profile error:', error);

    // 记录失败的资料更新
    const user = (request as any).user;
    if (user) {
      await logUserAction(
        user.userId,
        'PROFILE_UPDATE_FAILED',
        'user',
        user.userId,
        undefined,
        { reason: error.message, attemptedFields: body ? Object.keys(body) : [] },
        getClientIP(request),
        request.headers.get('user-agent') || undefined
      );
    }

    return NextResponse.json(
      { error: '更新用户资料失败，请稍后重试' },
      { status: 500 }
    );
  }
}
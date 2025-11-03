import { NextRequest, NextResponse } from 'next/server';

import { authenticateToken, logUserAction, getClientIP } from '../../../../backend/auth/auth.middleware';
import { AuthService } from '../../../../backend/auth/auth.service';

const authService = new AuthService();

// 获取用户资料
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authenticateToken(request);
    if (authResult) {
      return authResult; // 返回认证错误
    }

    // 获取用户信息
    const user = (request as any).user;

    // 获取用户资料
    const profile = await authService.getProfile(user.userId);

    // 返回用户资料（不包含敏感信息）
    const safeProfile = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      avatar: profile.avatar,
      role: profile.role,
      createdAt: profile.createdAt
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
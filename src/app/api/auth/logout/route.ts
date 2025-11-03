import { NextRequest, NextResponse } from 'next/server';

import { authenticateToken, logUserAction, getClientIP } from '../../../../backend/auth/auth.middleware';
import { AuthService } from '../../../../backend/auth/auth.service';

const authService = new AuthService();

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authenticateToken(request);
    if (authResult) {
      return authResult; // 返回认证错误
    }

    // 获取用户信息
    const user = (request as any).user;
    const authHeader = request.headers.get('authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return NextResponse.json(
        { error: '访问令牌缺失' },
        { status: 401 }
      );
    }

    // 用户登出
    await authService.logout(token);

    // 记录审计日志
    await logUserAction(
      user.userId,
      'USER_LOGOUT',
      'user',
      user.userId,
      undefined,
      { logoutTime: new Date().toISOString() },
      getClientIP(request),
      request.headers.get('user-agent') || undefined
    );

    return NextResponse.json({
      success: true,
      message: '退出登录成功'
    });

  } catch (error: any) {
    console.error('Logout error:', error);

    return NextResponse.json(
      { error: '退出登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}
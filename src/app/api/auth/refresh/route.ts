import { NextRequest, NextResponse } from 'next/server';

import { logUserAction, getClientIP } from '../../../../backend/auth/auth.middleware';
import { AuthService } from '../../../../backend/auth/auth.service';

const authService = new AuthService();

export async function POST(request: NextRequest) {
  let refreshToken: string | null = null;
  
  try {
    const body = await request.json();

    // 验证必填字段
    if (!body || !body.refreshToken) {
      return NextResponse.json(
        { error: '刷新令牌为必填项' },
        { status: 400 }
      );
    }

    refreshToken = body.refreshToken;

    // 刷新令牌
    const tokens = await authService.refreshToken(refreshToken!);

    // 获取用户信息（从JWT中解析）
    const jwt = require('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(tokens.accessToken, jwtSecret) as any;

    // 记录审计日志
    await logUserAction(
      decoded.userId,
      'TOKEN_REFRESH',
      'user',
      decoded.userId,
      undefined,
      { refreshTime: new Date().toISOString() },
      getClientIP(request),
      request.headers.get('user-agent') || undefined
    );

    return NextResponse.json({
      success: true,
      data: {
        tokens
      },
      message: '令牌刷新成功'
    });

  } catch (error: any) {
    console.error('Token refresh error:', error);

    // 记录失败的刷新尝试
    await logUserAction(
      'anonymous',
      'TOKEN_REFRESH_FAILED',
      'user',
      undefined,
      undefined,
      { reason: 'invalid_refresh_token' },
      getClientIP(request),
      request.headers.get('user-agent') || undefined
    );

    if (error.message.includes('无效的刷新令牌') || error.message.includes('刷新令牌已过期')) {
      return NextResponse.json(
        { error: '刷新令牌无效或已过期，请重新登录' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: '令牌刷新失败，请稍后重试' },
      { status: 500 }
    );
  }
}
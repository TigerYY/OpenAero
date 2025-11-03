// 安全警报API路由

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth-config';
import { securityMonitor } from '@/lib/security-monitor';

// 获取安全警报
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const alerts = await securityMonitor.getUserSecurityAlerts(
      session.user.id,
      unreadOnly
    );

    return NextResponse.json({
      success: true,
      data: alerts,
    });

  } catch (error) {
    console.error('获取安全警报失败:', error);
    return NextResponse.json(
      { error: '获取安全警报失败' },
      { status: 500 }
    );
  }
}

// 标记警报为已读
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { alertId } = body;

    if (!alertId) {
      return NextResponse.json(
        { error: '缺少警报ID' },
        { status: 400 }
      );
    }

    await securityMonitor.markAlertAsRead(alertId);

    return NextResponse.json({
      success: true,
      message: '警报已标记为已读',
    });

  } catch (error) {
    console.error('标记警报失败:', error);
    return NextResponse.json(
      { error: '标记警报失败' },
      { status: 500 }
    );
  }
}
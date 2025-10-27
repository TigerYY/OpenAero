// 安全事件API路由

import { NextRequest, NextResponse } from 'next/server';
import { securityMonitor } from '@/lib/security-monitor';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

// 获取安全事件
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
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const eventType = searchParams.get('eventType');
    const severity = searchParams.get('severity');

    const events = await securityMonitor.getUserSecurityEvents(
      session.user.id,
      limit
    );

    return NextResponse.json({
      success: true,
      data: events,
    });

  } catch (error) {
    console.error('获取安全事件失败:', error);
    return NextResponse.json(
      { error: '获取安全事件失败' },
      { status: 500 }
    );
  }
}

// 创建安全事件
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      eventType,
      severity,
      description,
      deviceId,
      ipAddress,
      userAgent,
      location,
      metadata
    } = body;

    const event = await securityMonitor.recordSecurityEvent({
      userId: session.user.id,
      deviceId,
      eventType,
      severity,
      description,
      details: {
        ipAddress,
        userAgent,
        location,
        ...metadata
      },
    });

    return NextResponse.json({
      success: true,
      data: event,
    });

  } catch (error) {
    console.error('创建安全事件失败:', error);
    return NextResponse.json(
      { error: '创建安全事件失败' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { notificationService } from '@/backend/notification/notification.service';
import { authOptions } from '@/lib/auth-config';

// 获取用户通知列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const result = await notificationService.getUserNotifications(
      session.user.id,
      page,
      limit,
      unreadOnly
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('获取通知列表失败:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 发送通知 (管理员功能)
const sendNotificationSchema = z.object({
  type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'REVIEW', 'SYSTEM']),
  title: z.string().min(1, '标题不能为空'),
  message: z.string().min(1, '消息内容不能为空'),
  userId: z.string().optional(),
  userIds: z.array(z.string()).optional(),
  actionUrl: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  channels: z.array(z.string()).optional(),
  scheduledAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 检查管理员权限
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const data = sendNotificationSchema.parse(body);

    // 单个用户通知
    if (data.userId) {
      await notificationService.sendNotification({
        type: data.type as any,
        title: data.title,
        message: data.message,
        userId: data.userId,
        actionUrl: data.actionUrl,
        metadata: data.metadata,
        priority: data.priority as any,
        channels: data.channels,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      });
    }

    // 批量用户通知
    if (data.userIds && data.userIds.length > 0) {
      const notifications = data.userIds.map(userId => ({
        type: data.type as any,
        title: data.title,
        message: data.message,
        userId,
        actionUrl: data.actionUrl,
        metadata: data.metadata,
        priority: data.priority as any,
        channels: data.channels,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      }));

      await notificationService.sendBatchNotifications(notifications);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('发送通知失败:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 删除通知
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    await notificationService.deleteNotification(notificationId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除通知失败:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
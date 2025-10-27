import { NextRequest, NextResponse } from 'next/server';
import { NotificationData } from '@/lib/websocket';

// 模拟通知数据存储
let notifications: NotificationData[] = [
  {
    id: '1',
    type: 'info',
    title: '新的解决方案',
    message: '有新的 React 组件库解决方案发布了',
    timestamp: Date.now() - 3600000,
    read: false,
    userId: 'user1',
    actionUrl: '/solutions/react-components'
  },
  {
    id: '2',
    type: 'success',
    title: '支付成功',
    message: '您的订单支付已成功处理',
    timestamp: Date.now() - 7200000,
    read: false,
    userId: 'user1'
  },
  {
    id: '3',
    type: 'warning',
    title: '账户安全',
    message: '检测到异常登录，请及时修改密码',
    timestamp: Date.now() - 86400000,
    read: true,
    userId: 'user1'
  },
  {
    id: '4',
    type: 'error',
    title: '上传失败',
    message: '文件上传失败，请检查网络连接',
    timestamp: Date.now() - 172800000,
    read: true,
    userId: 'user1'
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'user1'; // 应该从认证中获取
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    // 过滤用户的通知
    let userNotifications = notifications.filter(n => n.userId === userId);

    // 按类型过滤
    if (type) {
      userNotifications = userNotifications.filter(n => n.type === type);
    }

    // 只显示未读
    if (unreadOnly) {
      userNotifications = userNotifications.filter(n => !n.read);
    }

    // 按时间排序（最新的在前）
    userNotifications.sort((a, b) => b.timestamp - a.timestamp);

    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedNotifications = userNotifications.slice(startIndex, endIndex);

    // 计算未读数量
    const unreadCount = notifications.filter(n => n.userId === userId && !n.read).length;

    return NextResponse.json({
      success: true,
      notifications: paginatedNotifications,
      pagination: {
        page,
        limit,
        total: userNotifications.length,
        totalPages: Math.ceil(userNotifications.length / limit)
      },
      unreadCount
    });

  } catch (error) {
    console.error('获取通知失败:', error);
    return NextResponse.json(
      { success: false, error: '获取通知失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, message, userId, actionUrl } = body;

    if (!type || !title || !message || !userId) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const notification: NotificationData = {
      id: generateNotificationId(),
      type,
      title,
      message,
      timestamp: Date.now(),
      read: false,
      userId,
      actionUrl
    };

    notifications.unshift(notification);

    // 这里应该通过 WebSocket 实时推送通知
    // wsManager.sendToUser(userId, {
    //   type: 'notification',
    //   data: notification
    // });

    return NextResponse.json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('创建通知失败:', error);
    return NextResponse.json(
      { success: false, error: '创建通知失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'user1';

    // 删除用户的所有通知
    notifications = notifications.filter(n => n.userId !== userId);

    return NextResponse.json({
      success: true,
      message: '所有通知已清空'
    });

  } catch (error) {
    console.error('清空通知失败:', error);
    return NextResponse.json(
      { success: false, error: '清空通知失败' },
      { status: 500 }
    );
  }
}

function generateNotificationId(): string {
  return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
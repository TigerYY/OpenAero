import { NextRequest, NextResponse } from 'next/server';

// 这里应该导入真实的数据存储，现在使用模拟数据
// 在实际应用中，这应该是数据库操作
let notifications = [
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
  }
];

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notificationId = params.id;
    const userId = 'user1'; // 应该从认证中获取

    // 查找并更新通知
    const notificationIndex = notifications.findIndex(
      n => n.id === notificationId && n.userId === userId
    );

    if (notificationIndex === -1) {
      return NextResponse.json(
        { success: false, error: '通知不存在' },
        { status: 404 }
      );
    }

    const notification = notifications[notificationIndex];
    if (notification) {
      notification.read = true;
    }

    return NextResponse.json({
      success: true,
      notification: notifications[notificationIndex]
    });

  } catch (error) {
    console.error('标记通知为已读失败:', error);
    return NextResponse.json(
      { success: false, error: '标记通知为已读失败' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';

// 模拟通知数据存储（在实际应用中应该使用数据库）
const notifications = [
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

export async function PUT(request: NextRequest) {
  try {
    const userId = 'user1'; // 应该从认证中获取

    // 标记用户的所有通知为已读
    let updatedCount = 0;
    notifications.forEach(notification => {
      if (notification.userId === userId && !notification.read) {
        notification.read = true;
        updatedCount++;
      }
    });

    return NextResponse.json({
      success: true,
      message: `已标记 ${updatedCount} 条通知为已读`,
      updatedCount
    });

  } catch (error) {
    console.error('标记所有通知为已读失败:', error);
    return NextResponse.json(
      { success: false, error: '标记所有通知为已读失败' },
      { status: 500 }
    );
  }
}
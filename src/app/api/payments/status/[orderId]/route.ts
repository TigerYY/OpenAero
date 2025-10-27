import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: '订单ID不能为空' },
        { status: 400 }
      );
    }

    // TODO: 从数据库查询订单状态
    // 这里使用模拟数据
    const mockOrder = {
      id: orderId,
      userId: 'user_123',
      solutionId: 'solution_456',
      amount: 299.00,
      currency: 'CNY',
      paymentMethod: 'alipay',
      status: 'pending', // pending, paid, failed, cancelled, expired
      createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10分钟前创建
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 20 * 60 * 1000), // 20分钟后过期
      transactionId: null
    };

    // 检查订单是否过期
    const now = new Date();
    if (mockOrder.status === 'pending' && now > mockOrder.expiresAt) {
      mockOrder.status = 'expired';
      mockOrder.updatedAt = now;
      
      // TODO: 更新数据库中的订单状态
      console.log(`订单 ${orderId} 已过期`);
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: mockOrder.id,
        status: mockOrder.status,
        amount: mockOrder.amount,
        currency: mockOrder.currency,
        paymentMethod: mockOrder.paymentMethod,
        createdAt: mockOrder.createdAt,
        updatedAt: mockOrder.updatedAt,
        expiresAt: mockOrder.expiresAt,
        transactionId: mockOrder.transactionId,
        // 计算剩余时间（秒）
        remainingTime: mockOrder.status === 'pending' 
          ? Math.max(0, Math.floor((mockOrder.expiresAt.getTime() - now.getTime()) / 1000))
          : 0
      }
    });

  } catch (error) {
    console.error('查询订单状态失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
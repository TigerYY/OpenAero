import { NextRequest, NextResponse } from 'next/server';

import { getOrderById, updateOrderStatus, cancelOrder } from '@/lib/order';

export const dynamic = 'force-dynamic';

/**
 * GET /api/orders/[id] - 获取订单详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份
    if (authResult) {
      return authResult; // 返回认证错误
    }

    // 获取用户信息
    const user = (request as any).user;
    
    const orderId = params.id;
    
    if (!orderId) {
      return NextResponse.json(
        { error: '订单ID不能为空' },
        { status: 400 }
      );
    }

    const order = await getOrderById(orderId);

    if (!order) {
      return NextResponse.json(
        { error: '订单不存在' },
        { status: 404 }
      );
    }

    // 检查订单是否属于当前用户
    if (order.userId !== user.userId) {
      return NextResponse.json(
        { error: '无权访问此订单' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('获取订单详情失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '获取订单详情失败' 
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/orders/[id] - 更新订单状态
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份
    if (authResult) {
      return authResult; // 返回认证错误
    }

    // 获取用户信息
    const user = (request as any).user;
    
    const orderId = params.id;
    const body = await request.json();
    const { status } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: '订单ID不能为空' },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { error: '订单状态不能为空' },
        { status: 400 }
      );
    }

    // 验证订单是否存在且属于当前用户
    const existingOrder = await getOrderById(orderId);
    if (!existingOrder) {
      return NextResponse.json(
        { error: '订单不存在' },
        { status: 404 }
      );
    }

    if (existingOrder.userId !== user.userId) {
      return NextResponse.json(
        { error: '无权修改此订单' },
        { status: 403 }
      );
    }

    const updatedOrder = await updateOrderStatus(orderId, status);

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: '订单状态更新成功',
    });
  } catch (error) {
    console.error('更新订单状态失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '更新订单状态失败' 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orders/[id] - 取消订单
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份
    if (authResult) {
      return authResult; // 返回认证错误
    }

    // 获取用户信息
    const user = (request as any).user;
    
    const orderId = params.id;

    if (!orderId) {
      return NextResponse.json(
        { error: '订单ID不能为空' },
        { status: 400 }
      );
    }

    // 验证订单是否存在且属于当前用户
    const existingOrder = await getOrderById(orderId);
    if (!existingOrder) {
      return NextResponse.json(
        { error: '订单不存在' },
        { status: 404 }
      );
    }

    if (existingOrder.userId !== user.userId) {
      return NextResponse.json(
        { error: '无权取消此订单' },
        { status: 403 }
      );
    }

    const cancelledOrder = await cancelOrder(orderId);

    return NextResponse.json({
      success: true,
      data: cancelledOrder,
      message: '订单取消成功',
    });
  } catch (error) {
    console.error('取消订单失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '取消订单失败' 
      },
      { status: 500 }
    );
  }
}
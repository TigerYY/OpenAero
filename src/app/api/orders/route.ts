import { NextRequest, NextResponse } from 'next/server';

import { createOrder, getUserOrders } from '@/lib/order';

export const dynamic = 'force-dynamic';

/**
 * GET /api/orders - 获取用户订单列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    if (authResult) {
      return authResult; // 返回认证错误
    }

    // 获取用户信息
    const user = (request as any).user;
    
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const result = await getUserOrders(user.userId, page, limit);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '获取订单列表失败' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders - 创建新订单
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    if (authResult) {
      return authResult; // 返回认证错误
    }

    // 获取用户信息
    const user = (request as any).user;

    const body = await request.json();
    const { items, notes, shippingAddress, billingAddress } = body;

    // 验证请求数据
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: '订单项不能为空' },
        { status: 400 }
      );
    }

    // 验证每个订单项
    for (const item of items) {
      if (!item.solutionId || !item.quantity || !item.price) {
        return NextResponse.json(
          { error: '订单项信息不完整' },
          { status: 400 }
        );
      }
      
      if (item.quantity <= 0 || item.price <= 0) {
        return NextResponse.json(
          { error: '数量和价格必须大于0' },
          { status: 400 }
        );
      }
    }

    const orderData = {
      userId: user.userId,
      items,
      notes,
      shippingAddress,
      billingAddress,
    };

    const order = await createOrder(orderData);

    return NextResponse.json({
      success: true,
      data: order,
      message: '订单创建成功',
    });
  } catch (error) {
    console.error('创建订单失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '创建订单失败' 
      },
      { status: 500 }
    );
  }
}
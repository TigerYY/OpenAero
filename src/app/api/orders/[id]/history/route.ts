/**
 * 订单历史记录 API
 * GET /api/orders/[id]/history - 获取订单历史记录
 */

import { NextRequest } from 'next/server';
import { getServerUser } from '@/lib/auth/auth-service';
import {
  createSuccessResponse,
  createErrorResponse,
} from '@/lib/api-helpers';
import { getOrderHistory } from '@/lib/order-history';
import { getOrderById } from '@/lib/order';

export const dynamic = 'force-dynamic';

/**
 * GET /api/orders/[id]/history - 获取订单历史记录
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return createErrorResponse('未授权访问', 401);
    }

    const orderId = params.id;
    if (!orderId) {
      return createErrorResponse('订单ID不能为空', 400);
    }

    // 验证订单是否属于当前用户
    const order = await getOrderById(orderId);
    if (!order) {
      return createErrorResponse('订单不存在', 404);
    }

    if (order.userId !== user.id) {
      return createErrorResponse('无权访问此订单', 403);
    }

    const history = await getOrderHistory(orderId);

    return createSuccessResponse(history, '获取订单历史记录成功');
  } catch (error) {
    console.error('获取订单历史记录失败:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : '获取订单历史记录失败',
      error instanceof Error && error.message.includes('不存在') ? 404 : 500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}


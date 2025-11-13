/**
 * 订单物流跟踪 API
 * GET /api/orders/[id]/tracking - 获取订单物流跟踪信息
 */

import { NextRequest } from 'next/server';
import { getServerUser } from '@/lib/auth/auth-service';
import {
  createSuccessResponse,
  createErrorResponse,
} from '@/lib/api-helpers';
import { getOrderTracking, addTrackingEvent } from '@/lib/order-tracking';
import { getOrderById } from '@/lib/order';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const addTrackingEventSchema = z.object({
  location: z.string().optional(),
  status: z.enum(['pending', 'in_transit', 'delivered', 'exception']),
  description: z.string().min(1, '描述不能为空'),
  operator: z.string().optional(),
});

/**
 * GET /api/orders/[id]/tracking - 获取订单物流跟踪信息
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

    const trackingInfo = await getOrderTracking(orderId);

    if (!trackingInfo) {
      return createErrorResponse('无法获取物流跟踪信息', 404);
    }

    return createSuccessResponse(trackingInfo, '获取物流跟踪信息成功');
  } catch (error) {
    console.error('获取物流跟踪信息失败:', error);
    return createErrorResponse(
      '获取物流跟踪信息失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

/**
 * POST /api/orders/[id]/tracking - 添加物流跟踪事件（管理员）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return createErrorResponse('未授权访问', 401);
    }

    // TODO: 验证管理员权限
    // const isAdmin = await checkAdminPermission(user.id);
    // if (!isAdmin) {
    //   return createErrorResponse('需要管理员权限', 403);
    // }

    const orderId = params.id;
    if (!orderId) {
      return createErrorResponse('订单ID不能为空', 400);
    }

    const body = await request.json();
    const validationResult = addTrackingEventSchema.safeParse(body);

    if (!validationResult.success) {
      return createErrorResponse(
        '物流事件数据验证失败',
        400,
        { errors: validationResult.error.errors }
      );
    }

    await addTrackingEvent(orderId, {
      ...validationResult.data,
      operator: validationResult.data.operator || user.id,
    });

    return createSuccessResponse(null, '物流跟踪事件添加成功');
  } catch (error) {
    console.error('添加物流跟踪事件失败:', error);
    return createErrorResponse(
      '添加物流跟踪事件失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}


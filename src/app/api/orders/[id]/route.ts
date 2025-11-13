import { NextRequest } from 'next/server';
import { OrderStatus } from '@prisma/client';
import { getServerUser } from '@/lib/auth/auth-service';
import {
  createSuccessResponse,
  createErrorResponse,
  logAuditAction,
} from '@/lib/api-helpers';
import { getOrderById, updateOrderStatus, cancelOrder } from '@/lib/order';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  reason: z.string().optional(),
});

/**
 * GET /api/orders/[id] - 获取订单详情
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

    const order = await getOrderById(orderId);

    if (!order) {
      return createErrorResponse('订单不存在', 404);
    }

    // 检查订单是否属于当前用户
    if (order.userId !== user.id) {
      return createErrorResponse('无权访问此订单', 403);
    }

    return createSuccessResponse(order, '获取订单详情成功');
  } catch (error) {
    console.error('获取订单详情失败:', error);
    return createErrorResponse(
      '获取订单详情失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
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
    const user = await getServerUser();
    if (!user) {
      return createErrorResponse('未授权访问', 401);
    }

    const orderId = params.id;
    if (!orderId) {
      return createErrorResponse('订单ID不能为空', 400);
    }

    const body = await request.json();
    const validationResult = updateOrderStatusSchema.safeParse(body);

    if (!validationResult.success) {
      return createErrorResponse(
        '订单状态数据验证失败',
        400,
        { errors: validationResult.error.errors }
      );
    }

    const { status, reason } = validationResult.data;

    // 验证订单是否存在且属于当前用户
    const existingOrder = await getOrderById(orderId);
    if (!existingOrder) {
      return createErrorResponse('订单不存在', 404);
    }

    if (existingOrder.userId !== user.id) {
      return createErrorResponse('无权修改此订单', 403);
    }

    // 验证状态转换是否合法
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDED]: [],
    };

    const allowedStatuses = validTransitions[existingOrder.status];
    if (!allowedStatuses.includes(status)) {
      return createErrorResponse(
        `订单状态不能从"${existingOrder.status}"变更为"${status}"`,
        400
      );
    }

    const updatedOrder = await updateOrderStatus(orderId, status, user.id);

    // 记录审计日志
    await logAuditAction(request, {
      userId: user.id,
      action: 'ORDER_STATUS_UPDATED',
      resource: 'orders',
      resource_id: orderId,
      metadata: {
        previousStatus: existingOrder.status,
        newStatus: status,
        reason,
      },
    });

    return createSuccessResponse(updatedOrder, '订单状态更新成功');
  } catch (error) {
    console.error('更新订单状态失败:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : '更新订单状态失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
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
    const user = await getServerUser();
    if (!user) {
      return createErrorResponse('未授权访问', 401);
    }

    const orderId = params.id;
    if (!orderId) {
      return createErrorResponse('订单ID不能为空', 400);
    }

    // 验证订单是否存在且属于当前用户
    const existingOrder = await getOrderById(orderId);
    if (!existingOrder) {
      return createErrorResponse('订单不存在', 404);
    }

    if (existingOrder.userId !== user.id) {
      return createErrorResponse('无权取消此订单', 403);
    }

    const cancelledOrder = await cancelOrder(orderId);

    // 记录审计日志
    await logAuditAction(request, {
      userId: user.id,
      action: 'ORDER_CANCELLED',
      resource: 'orders',
      resource_id: orderId,
      metadata: {
        previousStatus: existingOrder.status,
      },
    });

    return createSuccessResponse(cancelledOrder, '订单取消成功');
  } catch (error) {
    console.error('取消订单失败:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : '取消订单失败',
      error instanceof Error && error.message.includes('不存在') ? 404 : 500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}
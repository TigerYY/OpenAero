/**
 * 订单退款 API
 * POST /api/orders/[id]/refund - 申请订单退款
 * GET /api/orders/[id]/refund - 获取订单退款信息
 */

import { NextRequest } from 'next/server';
import { getServerUser } from '@/lib/auth/auth-service';
import {
  createSuccessResponse,
  createErrorResponse,
  logAuditAction,
} from '@/lib/api-helpers';
import { createRefundRequest, getOrderRefund } from '@/lib/order-refund';
import { getOrderById } from '@/lib/order';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const refundRequestSchema = z.object({
  reason: z.string().min(1, '退款原因不能为空').max(500, '退款原因不能超过500字符'),
  amount: z.number().positive().optional(),
  description: z.string().max(1000, '退款说明不能超过1000字符').optional(),
});

/**
 * POST /api/orders/[id]/refund - 申请订单退款
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
      return createErrorResponse('无权操作此订单', 403);
    }

    const body = await request.json();
    const validationResult = refundRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return createErrorResponse(
        '退款申请数据验证失败',
        400,
        { errors: validationResult.error.errors }
      );
    }

    const refundResult = await createRefundRequest(user.id, {
      orderId,
      ...validationResult.data,
    });

    // 记录审计日志
    await logAuditAction(request, {
      userId: user.id,
      action: 'ORDER_REFUND_REQUESTED',
      resource: 'orders',
      resource_id: orderId,
      metadata: {
        refundId: refundResult.refundId,
        amount: refundResult.amount,
        reason: refundResult.reason,
      },
    });

    return createSuccessResponse(refundResult, '退款申请已提交，等待审核');
  } catch (error) {
    console.error('申请退款失败:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : '申请退款失败',
      error instanceof Error && error.message.includes('无权') ? 403 : 500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

/**
 * GET /api/orders/[id]/refund - 获取订单退款信息
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

    const refundInfo = await getOrderRefund(orderId);

    if (!refundInfo) {
      return createSuccessResponse(null, '该订单没有退款记录');
    }

    return createSuccessResponse(refundInfo, '获取退款信息成功');
  } catch (error) {
    console.error('获取退款信息失败:', error);
    return createErrorResponse(
      '获取退款信息失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}


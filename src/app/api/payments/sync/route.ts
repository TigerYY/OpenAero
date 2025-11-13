/**
 * 支付状态同步 API
 * POST /api/payments/sync - 手动触发支付状态同步
 * GET /api/payments/sync - 获取同步统计信息
 */

import { NextRequest } from 'next/server';
import {
  createSuccessResponse,
  createErrorResponse,
  requireAdminAuth,
  logAuditAction,
} from '@/lib/api-helpers';
import { syncPendingPayments, syncPaymentStatus } from '@/lib/payment/payment-status-sync';
import { z } from 'zod';

const syncSchema = z.object({
  paymentId: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
});

/**
 * POST - 手动触发支付状态同步
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await requireAdminAuth(request);
    if (authResult) {
      return authResult;
    }

    const body = await request.json().catch(() => ({}));
    const validationResult = syncSchema.safeParse(body);

    if (!validationResult.success) {
      return createErrorResponse('无效的请求参数', 400);
    }

    const { paymentId, limit } = validationResult.data;

    // 如果指定了paymentId，只同步该支付
    if (paymentId) {
      const success = await syncPaymentStatus(paymentId);
      
      await logAuditAction(request, {
        action: 'SYNC_PAYMENT_STATUS',
        resource: 'payments',
        resourceId: paymentId,
        metadata: { success },
      });

      if (success) {
        return createSuccessResponse(
          { paymentId, synced: true },
          '支付状态同步成功'
        );
      } else {
        return createErrorResponse('支付状态同步失败', 500);
      }
    }

    // 批量同步
    const result = await syncPendingPayments(limit);

    await logAuditAction(request, {
      action: 'SYNC_PAYMENTS_BATCH',
      resource: 'payments',
      metadata: result,
    });

    return createSuccessResponse(result, '批量同步完成');
  } catch (error: unknown) {
    console.error('支付状态同步失败:', error);
    return createErrorResponse(
      '支付状态同步失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

/**
 * GET - 获取同步统计信息
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await requireAdminAuth(request);
    if (authResult) {
      return authResult;
    }

    const { prisma } = await import('@/lib/prisma');
    const { PaymentStatus } = await import('@prisma/client');

    // 统计待同步的支付数量
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const pendingCount = await prisma.paymentTransaction.count({
      where: {
        status: {
          in: [PaymentStatus.PROCESSING, PaymentStatus.PENDING],
        },
        externalId: {
          not: null,
        },
        createdAt: {
          gte: oneDayAgo,
        },
      },
    });

    return createSuccessResponse({
      pendingCount,
      lastSyncTime: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('获取同步统计信息失败:', error);
    return createErrorResponse(
      '获取统计信息失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}


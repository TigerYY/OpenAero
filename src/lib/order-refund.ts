/**
 * 订单退款工具库
 */

import { prisma } from '@/lib/prisma';
import { OrderStatus, PaymentStatus } from '@prisma/client';

// 退款状态类型
type RefundStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface RefundRequest {
  orderId: string;
  reason: string;
  amount?: number; // 部分退款金额，不填则全额退款
  description?: string;
}

export interface RefundResult {
  refundId: string;
  orderId: string;
  amount: number;
  status: RefundStatus;
  reason: string;
  createdAt: Date;
}

/**
 * 创建退款申请
 */
export async function createRefundRequest(
  userId: string,
  request: RefundRequest
): Promise<RefundResult> {
  const order = await prisma.order.findUnique({
    where: { id: request.orderId },
    include: {
      paymentTransactions: {
        where: {
          status: PaymentStatus.COMPLETED,
        },
      },
    },
  });

  if (!order) {
    throw new Error('订单不存在');
  }

  if (order.userId !== userId) {
    throw new Error('无权操作此订单');
  }

  // 检查订单状态是否可以退款
  if (
    order.status === OrderStatus.REFUNDED ||
    order.status === OrderStatus.CANCELLED
  ) {
    throw new Error('订单已退款或已取消，无法再次申请退款');
  }

  if (order.status === OrderStatus.PENDING) {
    throw new Error('待支付订单无法申请退款，请直接取消订单');
  }

  // 检查是否已有成功的支付
  const completedPayment = order.paymentTransactions.find(
    (payment) => payment.status === PaymentStatus.COMPLETED
  );

  if (!completedPayment) {
    throw new Error('订单尚未支付，无法申请退款');
  }

  // 计算退款金额
  const refundAmount = request.amount
    ? Math.min(request.amount, Number(order.total))
    : Number(order.total);

  if (refundAmount <= 0) {
    throw new Error('退款金额必须大于0');
  }

  if (refundAmount > Number(order.total)) {
    throw new Error('退款金额不能超过订单总额');
  }

  // 创建退款记录（这里假设有一个 Refund 表，如果没有则需要创建）
  // 暂时使用 PaymentTransaction 的 refundAmount 字段
  const refund = await prisma.paymentTransaction.update({
    where: { id: completedPayment.id },
    data: {
      refundAmount: refundAmount,
      status: PaymentStatus.REFUNDED,
      refundedAt: new Date(),
      metadata: {
        ...((completedPayment.metadata as any) || {}),
        refund: {
          reason: request.reason,
          description: request.description,
          requestedAt: new Date().toISOString(),
          requestedBy: userId,
        },
      },
    },
  });

  // 更新订单状态为退款中（如果全额退款）或保持原状态（部分退款）
  if (refundAmount >= Number(order.total)) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.REFUNDED },
    });
  }

  return {
    refundId: refund.id,
    orderId: order.id,
    amount: refundAmount,
    status: 'PENDING' as RefundStatus,
    reason: request.reason,
    createdAt: new Date(),
  };
}

/**
 * 处理退款（管理员操作）
 */
export async function processRefund(
  refundId: string,
  adminId: string,
  approved: boolean,
  notes?: string
): Promise<void> {
  const payment = await prisma.paymentTransaction.findUnique({
    where: { id: refundId },
    include: {
      order: true,
    },
  });

  if (!payment) {
    throw new Error('退款记录不存在');
  }

  if (!payment.refundAmount) {
    throw new Error('该支付记录没有退款申请');
  }

  if (approved) {
    // 执行退款（这里需要调用第三方支付API）
    // TODO: 调用支付宝/微信支付的退款API
    
    // 更新退款状态
    await prisma.paymentTransaction.update({
      where: { id: refundId },
      data: {
        status: PaymentStatus.REFUNDED,
        refundedAt: new Date(),
        metadata: {
          ...((payment.metadata as any) || {}),
          refund: {
            ...((payment.metadata as any)?.refund || {}),
            processedAt: new Date().toISOString(),
            processedBy: adminId,
            approved: true,
            notes,
          },
        },
      },
    });

    // 更新订单状态
    await prisma.order.update({
      where: { id: payment.orderId },
      data: { status: OrderStatus.REFUNDED },
    });
  } else {
    // 拒绝退款
    await prisma.paymentTransaction.update({
      where: { id: refundId },
      data: {
        metadata: {
          ...((payment.metadata as any) || {}),
          refund: {
            ...((payment.metadata as any)?.refund || {}),
            processedAt: new Date().toISOString(),
            processedBy: adminId,
            approved: false,
            notes,
          },
        },
      },
    });
  }
}

/**
 * 获取订单退款信息
 */
export async function getOrderRefund(orderId: string): Promise<RefundResult | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      paymentTransactions: {
        where: {
          refundAmount: { not: null },
        },
        orderBy: { refundedAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!order || order.paymentTransactions.length === 0) {
    return null;
  }

  const refundPayment = order.paymentTransactions[0];
  const refundMetadata = (refundPayment.metadata as any)?.refund || {};

  return {
    refundId: refundPayment.id,
    orderId: order.id,
    amount: Number(refundPayment.refundAmount || 0),
    status: 'PENDING' as RefundStatus, // 需要根据实际状态判断
    reason: refundMetadata.reason || '退款申请',
    createdAt: refundPayment.refundedAt || refundPayment.createdAt,
  };
}


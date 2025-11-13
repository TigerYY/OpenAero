/**
 * 订单历史记录工具库
 */

import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';

export interface OrderHistoryEvent {
  id: string;
  orderId: string;
  eventType: 'CREATED' | 'STATUS_CHANGED' | 'PAYMENT_COMPLETED' | 'REFUNDED' | 'CANCELLED' | 'NOTE_ADDED';
  previousStatus?: OrderStatus;
  newStatus?: OrderStatus;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  createdBy?: string;
}

/**
 * 记录订单历史事件
 */
export async function addOrderHistory(
  orderId: string,
  eventType: OrderHistoryEvent['eventType'],
  description: string,
  metadata?: Record<string, any>,
  createdBy?: string
): Promise<void> {
  // 由于 Prisma schema 中没有 OrderHistory 表，我们使用订单的 notes 字段
  // 或者创建一个单独的 OrderHistory 表
  // 这里暂时使用一个简单的实现，将历史记录存储在订单的 metadata 中
  
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error('订单不存在');
  }

  const currentMetadata = (order.shippingAddress as any)?.history || [];
  const historyEvent: OrderHistoryEvent = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    orderId,
    eventType,
    description,
    metadata,
    createdAt: new Date(),
    createdBy,
  };

  // 如果是状态变更，记录前后状态
  if (eventType === 'STATUS_CHANGED' && metadata) {
    historyEvent.previousStatus = metadata.previousStatus;
    historyEvent.newStatus = metadata.newStatus;
  }

  const updatedHistory = [...currentMetadata, historyEvent];

  // 更新订单的 shippingAddress 字段存储历史记录
  // 更好的做法是创建一个单独的 OrderHistory 表
  await prisma.order.update({
    where: { id: orderId },
    data: {
      shippingAddress: {
        ...((order.shippingAddress as any) || {}),
        history: updatedHistory,
      },
    },
  });
}

/**
 * 获取订单历史记录
 */
export async function getOrderHistory(orderId: string): Promise<OrderHistoryEvent[]> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      shippingAddress: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!order) {
    throw new Error('订单不存在');
  }

  const history = (order.shippingAddress as any)?.history || [];

  // 如果没有历史记录，生成基础历史记录
  if (history.length === 0) {
    const baseHistory: OrderHistoryEvent[] = [
      {
        id: `${order.createdAt.getTime()}-base`,
        orderId: order.id,
        eventType: 'CREATED',
        description: '订单已创建',
        createdAt: order.createdAt,
      },
    ];

    // 如果订单状态不是 PENDING，添加状态变更记录
    if (order.status !== OrderStatus.PENDING) {
      baseHistory.push({
        id: `${order.updatedAt.getTime()}-status`,
        orderId: order.id,
        eventType: 'STATUS_CHANGED',
        previousStatus: OrderStatus.PENDING,
        newStatus: order.status,
        description: `订单状态变更为: ${order.status}`,
        createdAt: order.updatedAt,
      });
    }

    return baseHistory;
  }

  return history as OrderHistoryEvent[];
}

/**
 * 自动记录订单状态变更历史
 */
export async function recordOrderStatusChange(
  orderId: string,
  previousStatus: OrderStatus,
  newStatus: OrderStatus,
  changedBy?: string
): Promise<void> {
  const statusDescriptions: Record<OrderStatus, string> = {
    PENDING: '待处理',
    CONFIRMED: '已确认',
    PROCESSING: '处理中',
    SHIPPED: '已发货',
    DELIVERED: '已送达',
    CANCELLED: '已取消',
    REFUNDED: '已退款',
  };

  await addOrderHistory(
    orderId,
    'STATUS_CHANGED',
    `订单状态从"${statusDescriptions[previousStatus]}"变更为"${statusDescriptions[newStatus]}"`,
    {
      previousStatus,
      newStatus,
    },
    changedBy
  );
}


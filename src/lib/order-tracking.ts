/**
 * 订单物流跟踪工具库
 */

import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';

export interface TrackingInfo {
  trackingNumber?: string;
  carrier?: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'exception';
  events: TrackingEvent[];
  estimatedDelivery?: Date;
  currentLocation?: string;
}

export interface TrackingEvent {
  timestamp: Date;
  location?: string;
  status: string;
  description: string;
  operator?: string;
}

/**
 * 获取订单物流跟踪信息
 */
export async function getOrderTracking(orderId: string): Promise<TrackingInfo | null> {
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
    return null;
  }

  // 根据订单状态生成物流跟踪信息
  const trackingInfo = generateTrackingInfo(order.status, order.createdAt, order.updatedAt);

  return trackingInfo;
}

/**
 * 更新订单物流跟踪信息
 */
export async function updateOrderTracking(
  orderId: string,
  trackingData: Partial<TrackingInfo>
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error('订单不存在');
  }

  // 将物流跟踪信息存储在订单的 metadata 中
  // 这里我们使用 shippingAddress 字段的扩展来存储物流信息
  // 或者可以创建一个单独的 OrderTracking 表
  const currentShippingAddress = (order.shippingAddress as any) || {};
  
  await prisma.order.update({
    where: { id: orderId },
    data: {
      shippingAddress: {
        ...currentShippingAddress,
        tracking: {
          ...currentShippingAddress.tracking,
          ...trackingData,
          updatedAt: new Date().toISOString(),
        },
      },
    },
  });
}

/**
 * 添加物流跟踪事件
 */
export async function addTrackingEvent(
  orderId: string,
  event: Omit<TrackingEvent, 'timestamp'>
): Promise<void> {
  const trackingInfo = await getOrderTracking(orderId);
  
  if (!trackingInfo) {
    throw new Error('订单不存在或无法获取物流信息');
  }

  const newEvent: TrackingEvent = {
    ...event,
    timestamp: new Date(),
  };

  trackingInfo.events.push(newEvent);

  // 更新物流状态
  if (event.status === 'delivered') {
    trackingInfo.status = 'delivered';
  } else if (event.status === 'exception') {
    trackingInfo.status = 'exception';
  } else if (event.status === 'in_transit') {
    trackingInfo.status = 'in_transit';
  }

  await updateOrderTracking(orderId, {
    events: trackingInfo.events,
    status: trackingInfo.status,
  });
}

/**
 * 根据订单状态生成物流跟踪信息
 */
function generateTrackingInfo(
  orderStatus: OrderStatus,
  createdAt: Date,
  updatedAt: Date
): TrackingInfo {
  const baseEvents: TrackingEvent[] = [
    {
      timestamp: createdAt,
      status: 'pending',
      description: '订单已创建',
    },
  ];

  switch (orderStatus) {
    case OrderStatus.CONFIRMED:
      baseEvents.push({
        timestamp: updatedAt,
        status: 'pending',
        description: '订单已确认',
      });
      return {
        status: 'pending',
        events: baseEvents,
      };

    case OrderStatus.PROCESSING:
      baseEvents.push({
        timestamp: updatedAt,
        status: 'in_transit',
        description: '订单处理中',
      });
      return {
        status: 'in_transit',
        events: baseEvents,
      };

    case OrderStatus.SHIPPED:
      baseEvents.push({
        timestamp: updatedAt,
        status: 'in_transit',
        description: '订单已发货',
      });
      return {
        status: 'in_transit',
        events: baseEvents,
        estimatedDelivery: new Date(updatedAt.getTime() + 3 * 24 * 60 * 60 * 1000), // 3天后
      };

    case OrderStatus.DELIVERED:
      baseEvents.push({
        timestamp: updatedAt,
        status: 'delivered',
        description: '订单已送达',
      });
      return {
        status: 'delivered',
        events: baseEvents,
      };

    case OrderStatus.CANCELLED:
      baseEvents.push({
        timestamp: updatedAt,
        status: 'exception',
        description: '订单已取消',
      });
      return {
        status: 'exception',
        events: baseEvents,
      };

    case OrderStatus.REFUNDED:
      baseEvents.push({
        timestamp: updatedAt,
        status: 'exception',
        description: '订单已退款',
      });
      return {
        status: 'exception',
        events: baseEvents,
      };

    default:
      return {
        status: 'pending',
        events: baseEvents,
      };
  }
}


import { Order, OrderStatus, PaymentMethod, PaymentStatus, RevenueStatus, Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { generateOrderNumber } from '@/lib/utils';

export interface CreateOrderData {
  userId: string;
  items: {
    solutionId: string;
    quantity: number;
    price: number;
  }[];
  notes?: string;
  shippingAddress?: any;
  billingAddress?: any;
}

export interface OrderWithDetails extends Order {
  orderSolutions: Array<{
    id: string;
    quantity: number;
    price: Prisma.Decimal;
    subtotal: Prisma.Decimal;
    solution: {
      id: string;
      title: string;
      images: string[];
    };
  }>;
  paymentTransactions: Array<{
    id: string;
    paymentMethod: PaymentMethod;
    amount: Prisma.Decimal;
    status: PaymentStatus;
    createdAt: Date;
  }>;
}

/**
 * 创建订单
 */
export async function createOrder(data: CreateOrderData): Promise<OrderWithDetails> {
  const { userId, items, notes, shippingAddress, billingAddress } = data;

  // 计算订单总金额
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // 生成订单号
  const orderNumber = generateOrderNumber();

  // 创建订单和订单项
  const order = await prisma.order.create({
    data: {
      userId,
      orderNumber,
      total,
      notes,
      shippingAddress,
      billingAddress,
      status: OrderStatus.PENDING,
      orderSolutions: {
        create: items.map(item => ({
          solutionId: item.solutionId,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
        })),
      },
    },
    include: {
      orderSolutions: {
        include: {
          solution: {
            select: {
              id: true,
              title: true,
              images: true,
            },
          },
        },
      },
      paymentTransactions: true,
    },
  });

  return order as OrderWithDetails;
}

/**
 * 获取订单详情
 */
export async function getOrderById(orderId: string): Promise<OrderWithDetails | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderSolutions: {
        include: {
          solution: {
            select: {
              id: true,
              title: true,
              images: true,
            },
          },
        },
      },
      paymentTransactions: true,
    },
  });

  return order as OrderWithDetails | null;
}

/**
 * 获取用户订单列表
 */
export async function getUserOrders(
  userId: string,
  page: number = 1,
  limit: number = 10,
  status?: OrderStatus,
  search?: string
): Promise<{ orders: OrderWithDetails[]; total: number }> {
  const skip = (page - 1) * limit;

  // 构建查询条件
  const where: any = { userId };
  
  if (status) {
    where.status = status;
  }
  
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        orderSolutions: {
          include: {
            solution: {
              select: {
                id: true,
                title: true,
                images: true,
              },
            },
          },
        },
        paymentTransactions: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders: orders as OrderWithDetails[],
    total,
  };
}

/**
 * 更新订单状态
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  changedBy?: string
): Promise<Order> {
  // 获取当前订单状态
  const currentOrder = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });

  if (!currentOrder) {
    throw new Error('订单不存在');
  }

  // 更新订单状态
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { status },
  });

  // 记录状态变更历史
  if (currentOrder.status !== status) {
    try {
      const { recordOrderStatusChange } = await import('@/lib/order-history');
      await recordOrderStatusChange(orderId, currentOrder.status, status, changedBy);
    } catch (error) {
      // 如果历史记录功能不可用，只记录错误，不影响主流程
      console.error('记录订单状态变更历史失败:', error);
    }
  }

  return updatedOrder;
}

/**
 * 取消订单
 */
export async function cancelOrder(orderId: string): Promise<Order> {
  // 检查订单状态是否可以取消
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { paymentTransactions: true },
  });

  if (!order) {
    throw new Error('订单不存在');
  }

  if (order.status !== OrderStatus.PENDING) {
    throw new Error('只能取消待处理的订单');
  }

  // 检查是否有已完成的支付
  const hasCompletedPayment = order.paymentTransactions.some(
    (payment: any) => payment.status === PaymentStatus.COMPLETED
  );

  if (hasCompletedPayment) {
    throw new Error('已支付的订单无法直接取消，请申请退款');
  }

  return await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.CANCELLED },
  });
}

/**
 * 创建收益分成记录
 */
export async function createRevenueShares(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderSolutions: {
        include: {
          solution: {
            select: {
              id: true,
              creatorId: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error('订单不存在');
  }

  // 为每个订单项创建收益分成记录
  const revenueShares = order.orderSolutions.map((item: any) => {
    const totalAmount = Number(item.subtotal);
    const platformFee = totalAmount * 0.5; // 平台费用 50%
    const creatorRevenue = totalAmount * 0.5; // 创作者收益 50%

    return {
      orderId,
      solutionId: item.solutionId,
      creatorId: item.solution.creatorId,
      totalAmount,
      platformFee,
      creatorRevenue,
      status: RevenueStatus.PENDING,
    };
  });

  await prisma.revenueShare.createMany({
    data: revenueShares,
  });
}
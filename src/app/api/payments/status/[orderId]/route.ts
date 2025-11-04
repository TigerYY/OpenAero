import { PaymentStatus, OrderStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { authenticateToken } from '@/backend/auth/auth.middleware';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: '订单ID不能为空' },
        { status: 400 }
      );
    }

    // 验证用户身份
    const authResult = await authenticateToken(request);
    if (authResult) {
      return authResult; // 返回认证错误
    }

    // 获取用户信息
    const user = (request as any).user;

    // 查询订单和支付信息
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        paymentTransactions: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1, // 获取最新的支付记录
        },
        orderSolutions: {
          include: {
            solution: {
              include: {
                creator: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: '订单不存在' },
        { status: 404 }
      );
    }

    // 验证订单归属
    if (order.userId !== user.userId) {
      return NextResponse.json(
        { success: false, error: '无权访问此订单' },
        { status: 403 }
      );
    }

    const latestPayment = order.paymentTransactions[0];
    const now = new Date();
    const expiresAt = new Date(latestPayment.createdAt.getTime() + 30 * 60 * 1000); // 30分钟过期

    // 检查订单是否过期
    if (latestPayment.status === PaymentStatus.PENDING && now > expiresAt) {
      // 更新支付状态为失败
      await prisma.paymentTransaction.update({
        where: { id: latestPayment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: '支付超时',
        },
      });

      // 创建支付事件
      await prisma.paymentEvent.create({
        data: {
          paymentId: latestPayment.id,
          eventType: 'FAILED',
          eventData: {
            reason: '支付超时',
            expiredAt: expiresAt,
          },
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
        },
      });

      logger.info('支付订单已过期', {
        orderId: order.id,
        paymentId: latestPayment.id,
        userId: user.userId,
      });
    }

    // 重新获取更新后的支付信息
    const updatedPayment = await prisma.paymentTransaction.findUnique({
      where: { id: latestPayment.id },
    });

    const remainingTime = updatedPayment?.status === PaymentStatus.PENDING 
      ? Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: updatedPayment?.status || latestPayment.status,
        amount: Number(latestPayment.amount),
        currency: latestPayment.currency,
        paymentMethod: latestPayment.paymentMethod,
        createdAt: latestPayment.createdAt,
        updatedAt: latestPayment.updatedAt,
        expiresAt: expiresAt,
        transactionId: latestPayment.externalId,
        remainingTime,
        orderStatus: order.status,
        solutions: order.orderSolutions.map(os => ({
          id: os.solution.id,
          title: os.solution.title,
          creator: os.solution.creator,
          quantity: os.quantity,
          price: Number(os.price),
        })),
      }
    });

  } catch (error) {
    logger.error('查询订单状态失败', { error });
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
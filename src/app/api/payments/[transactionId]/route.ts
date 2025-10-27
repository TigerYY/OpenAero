import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateToken } from '@/backend/auth/auth.middleware';
import { Prisma } from '@prisma/client';

// 定义枚举类型
enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

interface PaymentUpdateData {
  status?: PaymentStatus;
  paymentMethod?: string;
  paymentProvider?: string;
  thirdPartyTransactionId?: string;
  paymentDetails?: any;
  metadata?: any;
}

// GET /api/payments/[transactionId] - 获取支付交易详情
export async function GET(
  request: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  try {
    // 验证用户身份
    const authResult = await authenticateToken(request);
    if (authResult) {
      return authResult;
    }

    const { transactionId } = params;

    // 查找支付交易
    const paymentTransaction = await (prisma as any).paymentTransaction.findUnique({
      where: { id: transactionId },
      include: {
        order: {
          include: {
            solution: {
              select: {
                id: true,
                title: true,
                price: true,
                creatorId: true
              }
            }
          }
        }
      }
    });

    if (!paymentTransaction) {
      return NextResponse.json(
        { success: false, error: '支付交易不存在' },
        { status: 404 }
      );
    }

    // 检查用户权限（只有订单创建者或解决方案创建者可以查看）
    const userId = (request as any).user?.userId;
    const isOrderOwner = paymentTransaction.order.userId === userId;
    const isSolutionCreator = paymentTransaction.order.solution.creatorId === userId;

    if (!isOrderOwner && !isSolutionCreator) {
      return NextResponse.json(
        { success: false, error: '无权限访问此支付交易' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: paymentTransaction
    });

  } catch (error) {
    console.error('获取支付交易详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取支付交易详情失败' },
      { status: 500 }
    );
  }
}

// POST /api/payments/[transactionId] - 更新支付状态
export async function POST(
  request: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  try {
    // 验证用户身份
    const authResult = await authenticateToken(request);
    if (authResult) {
      return authResult;
    }

    const userId = (request as any).user?.userId;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '用户未认证' },
        { status: 401 }
      );
    }

    const { transactionId } = params;
    const updateData: PaymentUpdateData = await request.json();

    // 查找支付交易
    const existingTransaction = await (prisma as any).paymentTransaction.findUnique({
      where: { id: transactionId },
      include: {
        order: {
          include: {
            solution: {
              select: {
                id: true,
                title: true,
                price: true,
                creatorId: true
              }
            }
          }
        }
      }
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { success: false, error: '支付交易不存在' },
        { status: 404 }
      );
    }

    // 检查用户权限
    const isOrderOwner = existingTransaction.order.userId === userId;
    const isSolutionCreator = existingTransaction.order.solution.creatorId === userId;

    if (!isOrderOwner && !isSolutionCreator) {
      return NextResponse.json(
        { success: false, error: '无权限更新此支付交易' },
        { status: 403 }
      );
    }

    // 使用事务更新支付状态和订单状态
    const result = await prisma.$transaction(async (tx) => {
      // 更新支付交易
      const updatedTransaction = await (tx as any).paymentTransaction.update({
        where: { id: transactionId },
        data: {
          ...updateData,
          updatedAt: new Date()
        },
        include: {
          order: {
            include: {
              solution: true
            }
          }
        }
      });

      // 如果支付完成，更新订单状态并创建收益分成
      if (updateData.status === PaymentStatus.COMPLETED) {
        // 更新订单状态
        await (tx as any).order.update({
          where: { id: updatedTransaction.orderId },
          data: {
            status: OrderStatus.PAID,
            updatedAt: new Date()
          }
        });

        // 创建收益分成记录
        const order = updatedTransaction.order;
        await createRevenueShares(
          tx,
          order.id,
          order.solution.id,
          order.solution.creatorId,
          order.totalAmount
        );

        // 更新创作者收益
        const platformFeeRate = 0.05; // 5% 平台费用
        const creatorRevenue = order.totalAmount * (1 - platformFeeRate);
        
        await (tx as any).creatorProfile.update({
          where: { userId: order.solution.creatorId },
          data: {
            totalRevenue: {
              increment: creatorRevenue
            },
            updatedAt: new Date()
          }
        });
      }

      return updatedTransaction;
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('更新支付状态失败:', error);
    return NextResponse.json(
      { success: false, error: '更新支付状态失败' },
      { status: 500 }
    );
  }
}

// 创建收益分成记录的辅助函数
async function createRevenueShares(
  tx: Prisma.TransactionClient,
  orderId: string,
  solutionId: string,
  creatorId: string,
  totalAmount: number
) {
  const platformFeeRate = 0.05; // 5% 平台费用
  const platformFee = totalAmount * platformFeeRate;
  const creatorRevenue = totalAmount - platformFee;

  return await (tx as any).revenueShare.create({
    data: {
      orderId,
      solutionId,
      creatorId,
      totalAmount,
      platformFee,
      creatorRevenue,
      status: 'PENDING'
    }
  });
}
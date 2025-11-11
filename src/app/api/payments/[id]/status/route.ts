import { PaymentStatus, OrderStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/payments/[id]/status - 查询支付状态
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份
    if (authResult) {
      return authResult;
    }

    const user = (request as any).user;
    const paymentId = params.id;

    if (!paymentId) {
      return NextResponse.json(
        { error: '支付ID不能为空' },
        { status: 400 }
      );
    }

    // 查找支付记录
    const payment = await prisma.paymentTransaction.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            orderSolutions: {
              include: {
                solution: {
                  select: {
                    id: true,
                    title: true,
                    price: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: '支付记录不存在' },
        { status: 404 }
      );
    }

    // 验证订单所有权
    if (payment.order.userId !== user.userId) {
      return NextResponse.json(
        { error: '无权查看此支付信息' },
        { status: 403 }
      );
    }

    // 如果支付状态是处理中，尝试查询第三方支付状态
    if (payment.status === PaymentStatus.PROCESSING && payment.externalId) {
      try {
        const updatedPayment = await checkExternalPaymentStatus(payment);
        if (updatedPayment) {
          return NextResponse.json({
            success: true,
            data: updatedPayment,
          });
        }
      } catch (error) {
        console.error('查询第三方支付状态失败:', error);
        // 继续返回当前状态，不影响主流程
      }
    }

    return NextResponse.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error('查询支付状态失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '查询支付状态失败' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payments/[id]/status - 更新支付状态（支付回调）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paymentId = params.id;
    const body = await request.json();

    if (!paymentId) {
      return NextResponse.json(
        { error: '支付ID不能为空' },
        { status: 400 }
      );
    }

    // 查找支付记录
    const payment = await prisma.paymentTransaction.findUnique({
      where: { id: paymentId },
      include: {
        order: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: '支付记录不存在' },
        { status: 404 }
      );
    }

    // 验证回调签名（这里应该根据具体的支付提供商实现签名验证）
    const isValidCallback = await verifyPaymentCallback(payment, body);
    if (!isValidCallback) {
      return NextResponse.json(
        { error: '无效的支付回调' },
        { status: 400 }
      );
    }

    const { status, externalId, externalStatus, failureReason } = body;

    // 更新支付状态
    const updatedPayment = await prisma.paymentTransaction.update({
      where: { id: paymentId },
      data: {
        status: status as PaymentStatus,
        externalId,
        externalStatus,
        failureReason,
        paidAt: status === PaymentStatus.COMPLETED ? new Date() : null,
        updatedAt: new Date(),
      },
    });

    // 如果支付成功，更新订单状态
    if (status === PaymentStatus.COMPLETED) {
      await prisma.order.update({
        where: { id: payment.orderId },
        data: {
          status: OrderStatus.CONFIRMED,
          updatedAt: new Date(),
        },
      });

      // 创建收益分成记录
      await createRevenueShares(payment.orderId);
    }

    // 如果支付失败，记录失败原因
    if (status === PaymentStatus.FAILED) {
      console.log(`支付失败 - 订单ID: ${payment.orderId}, 原因: ${failureReason}`);
      
      // 可以在这里添加失败通知逻辑
      await notifyPaymentFailure(payment, failureReason);
    }

    return NextResponse.json({
      success: true,
      data: updatedPayment,
      message: '支付状态更新成功',
    });
  } catch (error) {
    console.error('更新支付状态失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '更新支付状态失败' 
      },
      { status: 500 }
    );
  }
}

/**
 * 查询第三方支付状态
 */
async function checkExternalPaymentStatus(payment: any) {
  // 这里应该根据不同的支付提供商调用相应的API
  // 示例实现
  try {
    let externalStatus = null;
    
    switch (payment.paymentProvider) {
      case 'alipay':
        // 调用支付宝查询接口
        externalStatus = await queryAlipayStatus(payment.externalId);
        break;
      case 'wechat':
        // 调用微信支付查询接口
        externalStatus = await queryWechatStatus(payment.externalId);
        break;
      default:
        return null;
    }

    if (externalStatus) {
      // 根据第三方状态更新本地状态
      const newStatus = mapExternalStatusToLocal(externalStatus);
      
      if (newStatus !== payment.status) {
        const updatedPayment = await prisma.paymentTransaction.update({
          where: { id: payment.id },
          data: {
            status: newStatus,
            externalStatus: externalStatus.status,
            paidAt: newStatus === PaymentStatus.COMPLETED ? new Date() : null,
            failureReason: externalStatus.failureReason,
            updatedAt: new Date(),
          },
        });

        // 如果支付成功，更新订单状态
        if (newStatus === PaymentStatus.COMPLETED) {
          await prisma.order.update({
            where: { id: payment.orderId },
            data: {
              status: OrderStatus.CONFIRMED,
              updatedAt: new Date(),
            },
          });

          await createRevenueShares(payment.orderId);
        }

        return updatedPayment;
      }
    }

    return null;
  } catch (error) {
    console.error('查询第三方支付状态失败:', error);
    throw error;
  }
}

/**
 * 验证支付回调签名
 */
async function verifyPaymentCallback(payment: any, callbackData: any): Promise<boolean> {
  // 这里应该根据不同的支付提供商实现签名验证
  // 示例实现
  try {
    switch (payment.paymentProvider) {
      case 'alipay':
        return verifyAlipayCallback(callbackData);
      case 'wechat':
        return verifyWechatCallback(callbackData);
      default:
        return false;
    }
  } catch (error) {
    console.error('验证支付回调失败:', error);
    return false;
  }
}

/**
 * 创建收益分成记录
 */
async function createRevenueShares(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
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

    if (!order) return;

    for (const orderSolution of order.orderSolutions) {
      const totalAmount = Number(orderSolution.subtotal);
      const platformFeeRate = 0.1; // 10% 平台费用
      const platformFee = totalAmount * platformFeeRate;
      const creatorRevenue = totalAmount - platformFee;

      await prisma.revenueShare.create({
        data: {
          orderId,
          solutionId: orderSolution.solutionId,
          creatorId: orderSolution.solution.creatorId,
          totalAmount,
          platformFee,
          creatorRevenue,
          status: 'PENDING',
        },
      });
    }
  } catch (error) {
    console.error('创建收益分成记录失败:', error);
  }
}

/**
 * 通知支付失败
 */
async function notifyPaymentFailure(payment: any, failureReason: string) {
  try {
    // 这里可以实现邮件通知、短信通知等
    console.log(`支付失败通知 - 支付ID: ${payment.id}, 原因: ${failureReason}`);
    
    // 示例：记录到系统日志
    // await logService.error('payment_failure', {
    //   paymentId: payment.id,
    //   orderId: payment.orderId,
    //   failureReason,
    // });
  } catch (error) {
    console.error('发送支付失败通知失败:', error);
  }
}

/**
 * 查询支付宝支付状态
 */
async function queryAlipayStatus(externalId: string) {
  // 这里应该调用支付宝的查询接口
  // 示例实现
  return {
    status: 'TRADE_SUCCESS',
    failureReason: null,
  };
}

/**
 * 查询微信支付状态
 */
async function queryWechatStatus(externalId: string) {
  // 这里应该调用微信支付的查询接口
  // 示例实现
  return {
    status: 'SUCCESS',
    failureReason: null,
  };
}

/**
 * 将第三方状态映射到本地状态
 */
function mapExternalStatusToLocal(externalStatus: any): PaymentStatus {
  // 根据不同支付提供商的状态码映射到本地状态
  switch (externalStatus.status) {
    case 'TRADE_SUCCESS':
    case 'SUCCESS':
      return PaymentStatus.COMPLETED;
    case 'TRADE_CLOSED':
    case 'CLOSED':
      return PaymentStatus.CANCELLED;
    case 'WAIT_BUYER_PAY':
    case 'NOTPAY':
      return PaymentStatus.PENDING;
    default:
      return PaymentStatus.FAILED;
  }
}

/**
 * 验证支付宝回调
 */
function verifyAlipayCallback(callbackData: any): boolean {
  // 这里应该实现支付宝的签名验证逻辑
  // 示例实现
  return true;
}

/**
 * 验证微信支付回调
 */
function verifyWechatCallback(callbackData: any): boolean {
  // 这里应该实现微信支付的签名验证逻辑
  // 示例实现
  return true;
}
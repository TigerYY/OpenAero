import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { authenticateToken } from '@/backend/auth/auth.middleware';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payments/[id]/retry - 重试失败的支付
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份
    const authResult = await authenticateToken(request);
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
                solution: true,
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
        { error: '无权操作此支付' },
        { status: 403 }
      );
    }

    // 检查支付状态是否允许重试
    if (payment.status !== PaymentStatus.FAILED) {
      return NextResponse.json(
        { error: '只有失败的支付才能重试' },
        { status: 400 }
      );
    }

    // 检查重试次数限制
    const retryCount = await prisma.paymentTransaction.count({
      where: {
        orderId: payment.orderId,
        status: PaymentStatus.FAILED,
      },
    });

    if (retryCount >= 3) {
      return NextResponse.json(
        { error: '支付重试次数已达上限' },
        { status: 400 }
      );
    }

    // 检查订单状态
    if (payment.order.status !== 'PENDING') {
      return NextResponse.json(
        { error: '订单状态不允许支付' },
        { status: 400 }
      );
    }

    // 创建新的支付交易记录
    const newPayment = await prisma.paymentTransaction.create({
      data: {
        orderId: payment.orderId,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        paymentProvider: payment.paymentProvider,
        currency: payment.currency,
        status: PaymentStatus.PENDING,
        metadata: {
          ...payment.metadata as any,
          retryOf: payment.id,
          retryCount: retryCount + 1,
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        },
      },
    });

    // 根据支付方式生成支付数据
    const paymentData: any = {
      paymentId: newPayment.id,
      amount: newPayment.amount,
      method: newPayment.paymentMethod,
      status: newPayment.status,
      retryCount: retryCount + 1,
    };

    const body = await request.json().catch(() => ({}));
    const { returnUrl } = body;

    switch (newPayment.paymentMethod) {
      case PaymentMethod.ALIPAY:
        // 生成支付宝支付链接
        paymentData.paymentUrl = `https://openapi.alipay.com/gateway.do?app_id=your_app_id&method=alipay.trade.page.pay&charset=UTF-8&sign_type=RSA2&timestamp=${new Date().toISOString()}&version=1.0&notify_url=your_notify_url&return_url=${returnUrl}&biz_content={"out_trade_no":"${newPayment.id}","product_code":"FAST_INSTANT_TRADE_PAY","total_amount":"${newPayment.amount}","subject":"订单支付"}`;
        break;
      
      case PaymentMethod.WECHAT_PAY:
        // 生成微信支付二维码
        paymentData.qrCode = `weixin://wxpay/bizpayurl?pr=${newPayment.id}`;
        break;
      
      case PaymentMethod.BANK_TRANSFER:
        // 银行转账支付链接
        paymentData.paymentUrl = `/payment/bank-transfer/${newPayment.id}`;
        break;
      
      case PaymentMethod.CREDIT_CARD:
        // 信用卡支付链接
        paymentData.paymentUrl = `/payment/credit-card/${newPayment.id}`;
        break;
      
      default:
        return NextResponse.json(
          { error: '暂不支持该支付方式' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: paymentData,
      message: '支付重试创建成功',
    });
  } catch (error) {
    console.error('支付重试失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '支付重试失败' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/[id]/retry - 获取支付重试信息
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份
    const authResult = await authenticateToken(request);
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
        order: true,
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

    // 获取该订单的所有支付记录
    const allPayments = await prisma.paymentTransaction.findMany({
      where: {
        orderId: payment.orderId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 计算重试次数和状态
    const failedCount = allPayments.filter(p => p.status === PaymentStatus.FAILED).length;
    const canRetry = payment.status === PaymentStatus.FAILED && 
                     failedCount < 3 && 
                     payment.order.status === 'PENDING';

    return NextResponse.json({
      success: true,
      data: {
        payment,
        retryInfo: {
          canRetry,
          failedCount,
          maxRetries: 3,
          remainingRetries: Math.max(0, 3 - failedCount),
        },
        allPayments,
      },
    });
  } catch (error) {
    console.error('获取支付重试信息失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '获取支付重试信息失败' 
      },
      { status: 500 }
    );
  }
}
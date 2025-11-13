import { PaymentMethod, PaymentStatus, OrderStatus } from '@prisma/client';
import { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getServerUser } from '@/lib/auth/auth-service';
import {
  createSuccessResponse,
  createErrorResponse,
  logAuditAction,
} from '@/lib/api-helpers';
import { logger } from '@/lib/logger';
import { validatePaymentSecurity } from '@/lib/payment/payment-security';

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
    const user = await getServerUser();
    if (!user) {
      return createErrorResponse('未授权访问', 401);
    }
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
      return createErrorResponse('支付记录不存在', 404);
    }

    // 验证订单所有权
    if (payment.order.userId !== user.id) {
      await logAuditAction(request, {
        action: 'PAYMENT_RETRY_UNAUTHORIZED',
        resource: 'payments',
        resource_id: paymentId,
        metadata: { orderId: payment.orderId },
        success: false,
        errorMessage: '无权操作此支付',
      });
      return createErrorResponse('无权操作此支付', 403);
    }

    // 检查支付状态是否允许重试
    if (payment.status !== PaymentStatus.FAILED) {
      return createErrorResponse('只有失败的支付才能重试', 400);
    }

    // 检查重试次数限制
    const retryCount = await prisma.paymentTransaction.count({
      where: {
        orderId: payment.orderId,
        status: PaymentStatus.FAILED,
      },
    });

    const MAX_RETRIES = 3;
    if (retryCount >= MAX_RETRIES) {
      return createErrorResponse(`支付重试次数已达上限（最多${MAX_RETRIES}次）`, 400);
    }

    // 检查订单状态
    if (payment.order.status !== OrderStatus.PENDING) {
      return createErrorResponse('订单状态不允许支付', 400);
    }

    // 支付安全验证（重试时也需要验证）
    const securityCheck = await validatePaymentSecurity(request, {
      userId: user.id,
      orderId: payment.orderId,
      requestedAmount: payment.amount,
    });

    if (!securityCheck.valid) {
      await logAuditAction(request, {
        userId: user.id,
        action: 'PAYMENT_RETRY_SECURITY_CHECK_FAILED',
        resource: 'payments',
        resource_id: paymentId,
        metadata: {
          orderId: payment.orderId,
          amount: payment.amount,
          error: securityCheck.error,
          retryAfter: securityCheck.retryAfter,
        },
        success: false,
        errorMessage: securityCheck.error,
      });

      if (securityCheck.retryAfter) {
        return createErrorResponse(
          securityCheck.error || '支付安全验证失败',
          429,
          { retryAfter: securityCheck.retryAfter }
        );
      }

      return createErrorResponse(securityCheck.error || '支付安全验证失败', 400);
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

    // 生成支付URL（复用create-order的逻辑）
    let paymentUrl = '';
    const solutionTitle = payment.order.orderSolutions[0]?.solution?.title || '订单支付';
    const orderTitle = `OpenAero - ${solutionTitle}`;

    switch (newPayment.paymentMethod) {
      case PaymentMethod.ALIPAY:
        paymentUrl = generateAlipayUrl(newPayment.externalId || newPayment.id, newPayment.amount, orderTitle);
        break;
      
      case PaymentMethod.WECHAT_PAY:
        paymentUrl = generateWechatPayUrl(newPayment.externalId || newPayment.id, newPayment.amount, orderTitle);
        break;
      
      case PaymentMethod.BANK_TRANSFER:
        paymentUrl = `/payment/bank-transfer/${newPayment.id}`;
        break;
      
      case PaymentMethod.CREDIT_CARD:
        paymentUrl = `/payment/credit-card/${newPayment.id}`;
        break;
      
      default:
        return createErrorResponse('暂不支持该支付方式', 400);
    }

    paymentData.paymentUrl = paymentUrl;
    paymentData.expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30分钟后过期

    // 记录审计日志
    await logAuditAction(request, {
      action: 'PAYMENT_RETRY_CREATED',
      resource: 'payments',
      resource_id: newPayment.id,
      metadata: {
        originalPaymentId: paymentId,
        orderId: payment.orderId,
        amount: newPayment.amount,
        paymentMethod: newPayment.paymentMethod,
        retryCount: retryCount + 1,
      },
    });

    logger.info('支付重试创建成功', {
      paymentId: newPayment.id,
      originalPaymentId: paymentId,
      orderId: payment.orderId,
      userId: user.id,
      retryCount: retryCount + 1,
    });

    return createSuccessResponse(paymentData, '支付重试创建成功，请完成支付');
  } catch (error) {
    logger.error('支付重试失败', { error, paymentId: params.id });
    return createErrorResponse(
      error instanceof Error ? error.message : '支付重试失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

// 支付宝支付URL生成
function generateAlipayUrl(orderId: string, amount: number, subject: string): string {
  const params = new URLSearchParams({
    app_id: process.env.ALIPAY_APP_ID || 'demo_app_id',
    method: 'alipay.trade.page.pay',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: new Date().toISOString(),
    version: '1.0',
    out_trade_no: orderId,
    total_amount: amount.toString(),
    subject: subject,
    product_code: 'FAST_INSTANT_TRADE_PAY',
    notify_url: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/payments/webhook/alipay`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment/success`,
  });
  
  return `https://openapi.alipay.com/gateway.do?${params.toString()}`;
}

// 微信支付URL生成
function generateWechatPayUrl(orderId: string, amount: number, description: string): string {
  const params = new URLSearchParams({
    appid: process.env.WECHAT_APP_ID || 'demo_app_id',
    mch_id: process.env.WECHAT_MCH_ID || 'demo_mch_id',
    out_trade_no: orderId,
    total_fee: (amount * 100).toString(), // 微信支付金额以分为单位
    body: description,
    trade_type: 'NATIVE',
    notify_url: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/payments/webhook/wechat`,
  });
  
  return `weixin://wxpay/bizpayurl?${params.toString()}`;
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
    const user = await getServerUser();
    if (!user) {
      return createErrorResponse('未授权访问', 401);
    }
    const paymentId = params.id;

    if (!paymentId) {
      return createErrorResponse('支付ID不能为空', 400);
    }

    // 查找支付记录
    const payment = await prisma.paymentTransaction.findUnique({
      where: { id: paymentId },
      include: {
        order: true,
      },
    });

    if (!payment) {
      return createErrorResponse('支付记录不存在', 404);
    }

    // 验证订单所有权
    if (payment.order.userId !== user.id) {
      return createErrorResponse('无权查看此支付信息', 403);
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
    const MAX_RETRIES = 3;
    const failedCount = allPayments.filter(p => p.status === PaymentStatus.FAILED).length;
    const canRetry = payment.status === PaymentStatus.FAILED && 
                     failedCount < MAX_RETRIES && 
                     payment.order.status === OrderStatus.PENDING;

    return createSuccessResponse({
      payment,
      retryInfo: {
        canRetry,
        failedCount,
        maxRetries: MAX_RETRIES,
        remainingRetries: Math.max(0, MAX_RETRIES - failedCount),
      },
      allPayments,
    });
  } catch (error) {
    logger.error('获取支付重试信息失败', { error, paymentId: params.id });
    return createErrorResponse(
      error instanceof Error ? error.message : '获取支付重试信息失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}
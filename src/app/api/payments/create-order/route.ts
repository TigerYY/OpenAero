import { PaymentMethod, PaymentStatus, OrderStatus } from '@prisma/client';
import { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getServerUser } from '@/lib/auth/auth-service';
import {
  createSuccessResponse,
  createErrorResponse,
  logAuditAction,
  getRequestIp,
} from '@/lib/api-helpers';
import { validatePaymentSecurity } from '@/lib/payment/payment-security';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const user = await getServerUser();
    if (!user) {
      return createErrorResponse('未授权访问', 401);
    }

    const body = await request.json();
    const { solutionId, amount, paymentMethod, currency = 'CNY' } = body;

    // 验证输入
    if (!solutionId || !amount || !paymentMethod) {
      return createErrorResponse('缺少必要参数', 400);
    }

    if (!Object.values(PaymentMethod).includes(paymentMethod)) {
      return createErrorResponse('不支持的支付方式', 400);
    }

    if (amount <= 0) {
      return createErrorResponse('支付金额必须大于0', 400);
    }

    // 验证解决方案是否存在
    const solution = await prisma.solution.findUnique({
      where: { id: solutionId },
      include: {
        creator: true,
      },
    });

    if (!solution) {
      return createErrorResponse('解决方案不存在', 404);
    }

    if (solution.status !== 'APPROVED' && solution.status !== 'PUBLISHED') {
      return createErrorResponse('解决方案不可购买', 400);
    }

    // 支付安全验证（在创建订单前）
    const securityCheck = await validatePaymentSecurity(request, {
      userId: user.id,
      solutionId,
      requestedAmount: amount,
      solutionPrice: solution.price ? Number(solution.price) : undefined,
    });

    if (!securityCheck.valid) {
      await logAuditAction(request, {
        userId: user.id,
        action: 'PAYMENT_SECURITY_CHECK_FAILED',
        resource: 'payments',
        metadata: {
          solutionId,
          amount,
          paymentMethod,
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

    // 创建订单
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        status: OrderStatus.PENDING,
        total: amount,
        orderSolutions: {
          create: {
            solutionId: solutionId,
            quantity: 1,
            price: amount,
            subtotal: amount,
          },
        },
      },
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

    // 创建支付交易记录
    const externalId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const ipAddress = getRequestIp(request);
    
    const paymentTransaction = await prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        amount: amount,
        paymentMethod: paymentMethod,
        paymentProvider: paymentMethod === PaymentMethod.ALIPAY ? 'alipay' : 
                        paymentMethod === PaymentMethod.WECHAT_PAY ? 'wechat' : 
                        paymentMethod === PaymentMethod.CREDIT_CARD ? 'stripe' : 'bank_transfer',
        status: PaymentStatus.PENDING,
        externalId,
        metadata: {
          userAgent: request.headers.get('user-agent'),
          ip: ipAddress,
          createdAt: new Date().toISOString(),
          securityChecked: true,
        },
      },
    });

    // 创建支付事件记录
    await prisma.paymentEvent.create({
      data: {
        paymentId: paymentTransaction.id,
        eventType: 'CREATED',
        eventData: {
          orderId: order.id,
          amount: amount,
          paymentMethod: paymentMethod,
        },
        ipAddress: ipAddress,
        userAgent: request.headers.get('user-agent'),
      },
    });

    // 生成支付URL
    let paymentUrl = '';
    const solutionTitle = `OpenAero - ${solution.title}`;
    
    switch (paymentMethod) {
      case PaymentMethod.ALIPAY:
        paymentUrl = generateAlipayUrl(paymentTransaction.externalId, amount, solutionTitle);
        break;
      case PaymentMethod.WECHAT_PAY:
        paymentUrl = generateWechatPayUrl(paymentTransaction.externalId, amount, solutionTitle);
        break;
      case PaymentMethod.CREDIT_CARD:
        paymentUrl = `/payment/card/${paymentTransaction.externalId}`;
        break;
      case PaymentMethod.BANK_TRANSFER:
        paymentUrl = `/payment/bank/${paymentTransaction.externalId}`;
        break;
      default:
        paymentUrl = `/payment/redirect/${paymentTransaction.externalId}`;
    }

    // 记录审计日志
    await logAuditAction(request, {
      userId: user.id,
      action: 'PAYMENT_ORDER_CREATED',
      resource: 'payments',
      resource_id: paymentTransaction.id,
      metadata: {
        orderId: order.id,
        solutionId,
        amount,
        paymentMethod,
        paymentUrl,
      },
    });

    logger.info('支付订单创建成功', {
      orderId: order.id,
      paymentId: paymentTransaction.id,
      userId: user.id,
      amount: amount,
      paymentMethod: paymentMethod,
    });

    return createSuccessResponse(
      {
        orderId: order.id,
        paymentId: paymentTransaction.id,
        paymentUrl: paymentUrl,
        amount: amount,
        currency: currency,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30分钟后过期
        status: paymentTransaction.status,
      },
      '支付订单创建成功'
    );
  } catch (error) {
    logger.error('创建支付订单失败', { error });
    return createErrorResponse(
      error instanceof Error ? error.message : '服务器内部错误',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

// 支付宝支付URL生成
function generateAlipayUrl(orderId: string, amount: number, subject: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
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
    notify_url: `${baseUrl}/api/payments/webhook/alipay`,
    return_url: `${baseUrl}/payment/success`
  });
  
  return `https://openapi.alipay.com/gateway.do?${params.toString()}`;
}

// 微信支付URL生成
function generateWechatPayUrl(orderId: string, amount: number, description: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const params = new URLSearchParams({
    appid: process.env.WECHAT_APP_ID || 'demo_app_id',
    mch_id: process.env.WECHAT_MCH_ID || 'demo_mch_id',
    out_trade_no: orderId,
    total_fee: (amount * 100).toString(), // 微信支付金额以分为单位
    body: description,
    trade_type: 'NATIVE',
    notify_url: `${baseUrl}/api/payments/webhook/wechat`
  });
  
  return `weixin://wxpay/bizpayurl?${params.toString()}`;
}
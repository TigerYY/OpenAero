import { PaymentMethod, PaymentStatus, OrderStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    if (authResult) {
      return authResult; // 返回认证错误
    }

    // 获取用户信息
    const user = (request as any).user;

    const body = await request.json();
    const { solutionId, amount, paymentMethod, currency = 'CNY' } = body;

    // 验证输入
    if (!solutionId || !amount || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    if (!Object.values(PaymentMethod).includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, error: '不支持的支付方式' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: '支付金额必须大于0' },
        { status: 400 }
      );
    }

    // 验证解决方案是否存在
    const solution = await prisma.solution.findUnique({
      where: { id: solutionId },
      include: {
        creator: true,
      },
    });

    if (!solution) {
      return NextResponse.json(
        { success: false, error: '解决方案不存在' },
        { status: 404 }
      );
    }

    if (solution.status !== 'APPROVED' && solution.status !== 'PUBLISHED') {
      return NextResponse.json(
        { success: false, error: '解决方案不可购买' },
        { status: 400 }
      );
    }

    // 创建订单
    const order = await prisma.order.create({
      data: {
        userId: user.userId,
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
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
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
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
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

    logger.info('支付订单创建成功', {
      orderId: order.id,
      paymentId: paymentTransaction.id,
      userId: user.userId,
      amount: amount,
      paymentMethod: paymentMethod,
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        paymentId: paymentTransaction.id,
        paymentUrl: paymentUrl,
        amount: amount,
        currency: currency,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30分钟后过期
        status: paymentTransaction.status
      }
    });

  } catch (error) {
    logger.error('创建支付订单失败', { error });
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
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
    notify_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/webhook/alipay`,
    return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/orders/success`
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
    notify_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/webhook/wechat`
  });
  
  return `weixin://wxpay/bizpayurl?${params.toString()}`;
}
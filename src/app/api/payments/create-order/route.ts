import { NextRequest, NextResponse } from 'next/server';

export interface PaymentOrder {
  id: string;
  userId: string;
  solutionId: string;
  amount: number;
  currency: string;
  paymentMethod: 'alipay' | 'wechat';
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  paymentUrl?: string;
  transactionId?: string;
}

// 模拟支付宝支付URL生成
function generateAlipayUrl(orderId: string, amount: number, subject: string): string {
  // 在实际应用中，这里会调用支付宝SDK生成支付URL
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
    product_code: 'FAST_INSTANT_TRADE_PAY'
  });
  
  return `https://openapi.alipay.com/gateway.do?${params.toString()}`;
}

// 模拟微信支付URL生成
function generateWechatPayUrl(orderId: string, amount: number, description: string): string {
  // 在实际应用中，这里会调用微信支付SDK生成支付URL
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { solutionId, amount, paymentMethod, currency = 'CNY' } = body;

    // TODO: 从认证中获取用户ID
    const userId = 'user_123';

    // 验证输入
    if (!solutionId || !amount || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    if (!['alipay', 'wechat'].includes(paymentMethod)) {
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

    // 生成订单ID
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 创建订单
    const order: PaymentOrder = {
      id: orderId,
      userId,
      solutionId,
      amount,
      currency,
      paymentMethod,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30分钟后过期
    };

    // 生成支付URL
    const solutionTitle = `无人机解决方案 #${solutionId}`;
    if (paymentMethod === 'alipay') {
      order.paymentUrl = generateAlipayUrl(orderId, amount, solutionTitle);
    } else if (paymentMethod === 'wechat') {
      order.paymentUrl = generateWechatPayUrl(orderId, amount, solutionTitle);
    }

    // TODO: 将订单保存到数据库
    console.log('创建支付订单:', order);

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        paymentUrl: order.paymentUrl,
        amount: order.amount,
        currency: order.currency,
        expiresAt: order.expiresAt,
        status: order.status
      }
    });

  } catch (error) {
    console.error('创建支付订单失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
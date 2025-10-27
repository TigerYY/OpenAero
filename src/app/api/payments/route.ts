import { NextRequest, NextResponse } from 'next/server';
import { authenticateToken } from '@/backend/auth/auth.middleware';
import { prisma } from '@/lib/db';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payments - 创建支付
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authenticateToken(request);
    if (authResult) {
      return authResult; // 返回认证错误
    }

    // 获取用户信息
    const user = (request as any).user;

    const body = await request.json();
    const { orderId, amount, method, returnUrl } = body;

    // 验证请求数据
    if (!orderId || !amount || !method) {
      return NextResponse.json(
        { error: '订单ID、金额和支付方式不能为空' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: '支付金额必须大于0' },
        { status: 400 }
      );
    }

    // 验证支付方式
    if (!Object.values(PaymentMethod).includes(method)) {
      return NextResponse.json(
        { error: '不支持的支付方式' },
        { status: 400 }
      );
    }

    // 验证订单是否存在且属于当前用户
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderSolutions: {
          include: {
            solution: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: '订单不存在' },
        { status: 404 }
      );
    }

    if (order.userId !== user.userId) {
      return NextResponse.json(
        { error: '无权支付此订单' },
        { status: 403 }
      );
    }

    // 检查订单状态
    if (order.status !== 'PENDING') {
      return NextResponse.json(
        { error: '订单状态不允许支付' },
        { status: 400 }
      );
    }

    // 验证支付金额是否与订单金额一致
    if (Math.abs(amount - Number(order.total)) > 0.01) {
      return NextResponse.json(
        { error: '支付金额与订单金额不一致' },
        { status: 400 }
      );
    }

    // 创建支付交易记录
    const paymentTransaction = await prisma.paymentTransaction.create({
      data: {
        orderId,
        amount,
        method,
        status: PaymentStatus.PENDING,
        transactionId: `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        metadata: {
          returnUrl,
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        },
      },
    });

    // 根据支付方式生成支付链接或二维码
    let paymentData: any = {
      transactionId: paymentTransaction.transactionId,
      amount: paymentTransaction.amount,
      method: paymentTransaction.method,
      status: paymentTransaction.status,
    };

    switch (method) {
      case PaymentMethod.ALIPAY:
        // 这里应该调用支付宝API生成支付链接
        paymentData.paymentUrl = `https://openapi.alipay.com/gateway.do?app_id=your_app_id&method=alipay.trade.page.pay&charset=UTF-8&sign_type=RSA2&timestamp=${new Date().toISOString()}&version=1.0&notify_url=your_notify_url&return_url=${returnUrl}&biz_content={"out_trade_no":"${paymentTransaction.transactionId}","product_code":"FAST_INSTANT_TRADE_PAY","total_amount":"${amount}","subject":"OpenAero订单支付"}`;
        break;
      
      case PaymentMethod.WECHAT:
        // 这里应该调用微信支付API生成支付二维码
        paymentData.qrCode = `weixin://wxpay/bizpayurl?pr=${paymentTransaction.transactionId}`;
        break;
      
      case PaymentMethod.BANK_CARD:
        // 银行卡支付通常需要跳转到银行页面
        paymentData.paymentUrl = `/payment/bank-card/${paymentTransaction.transactionId}`;
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
      message: '支付创建成功',
    });
  } catch (error) {
    console.error('创建支付失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '创建支付失败' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments - 查询用户支付记录
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authenticateToken(request);
    if (authResult) {
      return authResult; // 返回认证错误
    }

    // 获取用户信息
    const user = (request as any).user;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const orderId = searchParams.get('orderId');

    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {
      order: {
        userId: user.userId,
      },
    };

    if (status && Object.values(PaymentStatus).includes(status as PaymentStatus)) {
      where.status = status;
    }

    if (orderId) {
      where.orderId = orderId;
    }

    // 查询支付记录
    const [payments, total] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where,
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
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.paymentTransaction.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        payments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('查询支付记录失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '查询支付记录失败' 
      },
      { status: 500 }
    );
  }
}
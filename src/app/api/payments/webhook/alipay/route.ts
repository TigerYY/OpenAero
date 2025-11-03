import { NextRequest, NextResponse } from 'next/server';
import { PaymentStatus, OrderStatus, PaymentEventType } from '@prisma/client';

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { RevenueService } from '@/lib/revenue.service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    
    // 获取支付宝回调参数
    const tradeStatus = params.get('trade_status');
    const outTradeNo = params.get('out_trade_no'); // 外部订单号（即我们的externalId）
    const tradeNo = params.get('trade_no'); // 支付宝交易号
    const totalAmount = params.get('total_amount');
    const buyerId = params.get('buyer_id');
    const gmtPayment = params.get('gmt_payment');
    const sign = params.get('sign');

    logger.info('支付宝回调参数', {
      tradeStatus,
      outTradeNo,
      tradeNo,
      totalAmount,
      buyerId,
      gmtPayment
    });

    // TODO: 验证签名
    // 在实际应用中，需要使用支付宝公钥验证签名
    if (!sign) {
      logger.error('支付宝回调缺少签名');
      return NextResponse.json({ success: false }, { status: 400 });
    }

    if (!outTradeNo) {
      logger.error('支付宝回调缺少外部订单号');
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // 根据externalId查找支付记录
    const paymentTransaction = await prisma.paymentTransaction.findFirst({
      where: { externalId: outTradeNo },
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

    if (!paymentTransaction) {
      logger.error('支付记录不存在', { externalId: outTradeNo });
      return NextResponse.json({ success: false }, { status: 404 });
    }

    // 创建支付事件记录
    await prisma.paymentEvent.create({
      data: {
        paymentId: paymentTransaction.id,
        eventType: 'WEBHOOK_RECEIVED',
        eventData: {
          tradeStatus,
          tradeNo,
          totalAmount,
          buyerId,
          gmtPayment,
          sign,
        },
        externalEventId: tradeNo,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    // 处理支付成功
    if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
      if (!tradeNo) {
        logger.error('支付宝回调缺少交易号');
        return NextResponse.json({ success: false }, { status: 400 });
      }

      logger.info('支付宝支付成功', {
        externalId: outTradeNo,
        tradeNo: tradeNo,
        paymentId: paymentTransaction.id,
        orderId: paymentTransaction.orderId,
      });

      // 更新支付状态
      await prisma.paymentTransaction.update({
        where: { id: paymentTransaction.id },
        data: {
          status: PaymentStatus.COMPLETED,
          externalStatus: tradeStatus,
          paidAt: gmtPayment ? new Date(gmtPayment) : new Date(),
        },
      });

      // 更新订单状态
      await prisma.order.update({
        where: { id: paymentTransaction.orderId },
        data: {
          status: OrderStatus.CONFIRMED,
        },
      });

      // 创建支付成功事件
      await prisma.paymentEvent.create({
        data: {
          paymentId: paymentTransaction.id,
          eventType: 'COMPLETED',
          eventData: {
            tradeNo,
            totalAmount,
            paidAt: gmtPayment,
          },
          externalEventId: tradeNo,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
        },
      });

      // 处理收益分成
      try {
        await RevenueService.processRevenueShare(paymentTransaction.orderId, paymentTransaction.id);
        logger.info('收益分成处理成功', {
          orderId: paymentTransaction.orderId,
          paymentId: paymentTransaction.id,
        });
      } catch (error) {
        logger.error('收益分成处理失败', {
          orderId: paymentTransaction.orderId,
          paymentId: paymentTransaction.id,
          error,
        });
      }

      // TODO: 发送支付成功通知
      await sendPaymentNotification(paymentTransaction.orderId, 'success');
      
      return NextResponse.json({ success: true });
    }

    // 处理支付失败
    if (tradeStatus === 'TRADE_CLOSED') {
      logger.info('支付宝支付失败', {
        externalId: outTradeNo,
        tradeStatus: tradeStatus,
        paymentId: paymentTransaction.id,
      });

      // 更新支付状态
      await prisma.paymentTransaction.update({
        where: { id: paymentTransaction.id },
        data: {
          status: PaymentStatus.FAILED,
          externalStatus: tradeStatus,
          failureReason: '支付被关闭',
        },
      });

      // 创建支付失败事件
      await prisma.paymentEvent.create({
        data: {
          paymentId: paymentTransaction.id,
          eventType: 'FAILED',
          eventData: {
            tradeStatus,
            reason: '支付被关闭',
          },
          externalEventId: tradeNo,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
        },
      });

      // TODO: 发送支付失败通知
      await sendPaymentNotification(paymentTransaction.orderId, 'failed');
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('处理支付宝回调失败', { error });
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

// 发送支付通知
async function sendPaymentNotification(orderId: string, status: 'success' | 'failed') {
  try {
    // TODO: 实际实现中应该发送邮件或推送通知
    logger.info('发送支付通知', {
      orderId: orderId,
      status: status,
    });
    
    return { success: true };
  } catch (error) {
    logger.error('发送支付通知失败', { orderId, status, error });
    return { success: false, error: error };
  }
}
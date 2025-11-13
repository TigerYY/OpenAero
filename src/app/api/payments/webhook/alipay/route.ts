import { PaymentStatus, OrderStatus, PaymentEventType } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { RevenueService } from '@/lib/revenue.service';
import { verifyAlipaySignature, verifyPaymentAmount } from '@/lib/payment/alipay-utils';
import {
  createSuccessResponse,
  createErrorResponse,
  logAuditAction,
} from '@/lib/api-helpers';

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

    // 验证必要参数
    if (!sign) {
      logger.error('支付宝回调缺少签名');
      await logAuditAction(request, {
        action: 'ALIPAY_WEBHOOK_INVALID',
        resource: 'payments',
        metadata: { reason: '缺少签名' },
        success: false,
        errorMessage: '缺少签名',
      });
      return createErrorResponse('缺少签名', 400);
    }

    if (!outTradeNo) {
      logger.error('支付宝回调缺少外部订单号');
      await logAuditAction(request, {
        action: 'ALIPAY_WEBHOOK_INVALID',
        resource: 'payments',
        metadata: { reason: '缺少外部订单号' },
        success: false,
        errorMessage: '缺少外部订单号',
      });
      return createErrorResponse('缺少外部订单号', 400);
    }

    // 根据externalId查找支付记录（先查找以获取金额用于验证）
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
      await logAuditAction(request, {
        action: 'ALIPAY_WEBHOOK_INVALID',
        resource: 'payments',
        metadata: { externalId: outTradeNo, reason: '支付记录不存在' },
        success: false,
        errorMessage: '支付记录不存在',
      });
      return createErrorResponse('支付记录不存在', 404);
    }

    // 验证签名
    const alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY;
    const isValidSignature = verifyAlipaySignature(params, sign, alipayPublicKey);
    
    if (!isValidSignature) {
      logger.error('支付宝回调签名验证失败', {
        externalId: outTradeNo,
        paymentId: paymentTransaction.id,
      });
      await logAuditAction(request, {
        userId: paymentTransaction.order.userId,
        action: 'ALIPAY_WEBHOOK_SIGNATURE_FAILED',
        resource: 'payments',
        resourceId: paymentTransaction.id,
        metadata: {
          externalId: outTradeNo,
          tradeNo,
        },
        success: false,
        errorMessage: '签名验证失败',
      });
      return createErrorResponse('签名验证失败', 400);
    }

    // 验证支付金额
    if (totalAmount) {
      const amountMatch = verifyPaymentAmount(
        Number(paymentTransaction.amount),
        totalAmount
      );
      if (!amountMatch) {
        logger.error('支付宝回调金额不匹配', {
          expected: paymentTransaction.amount,
          actual: totalAmount,
          externalId: outTradeNo,
        });
        await logAuditAction(request, {
          userId: paymentTransaction.order.userId,
          action: 'ALIPAY_WEBHOOK_AMOUNT_MISMATCH',
          resource: 'payments',
          resourceId: paymentTransaction.id,
          metadata: {
            externalId: outTradeNo,
            expectedAmount: paymentTransaction.amount,
            actualAmount: totalAmount,
          },
          success: false,
          errorMessage: '支付金额不匹配',
        });
        return createErrorResponse('支付金额不匹配', 400);
      }
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
        await logAuditAction(request, {
          userId: paymentTransaction.order.userId,
          action: 'ALIPAY_WEBHOOK_INVALID',
          resource: 'payments',
          resourceId: paymentTransaction.id,
          metadata: { reason: '缺少交易号' },
          success: false,
          errorMessage: '缺少交易号',
        });
        return createErrorResponse('缺少交易号', 400);
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

      // 记录审计日志
      await logAuditAction(request, {
        userId: paymentTransaction.order.userId,
        action: 'ALIPAY_PAYMENT_COMPLETED',
        resource: 'payments',
        resourceId: paymentTransaction.id,
        metadata: {
          externalId: outTradeNo,
          tradeNo,
          totalAmount,
          buyerId,
        },
      });

      // TODO: 发送支付成功通知
      await sendPaymentNotification(paymentTransaction.orderId, 'success');
      
      return createSuccessResponse({ tradeNo, outTradeNo }, '支付成功');
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

      // 记录审计日志
      await logAuditAction(request, {
        userId: paymentTransaction.order.userId,
        action: 'ALIPAY_PAYMENT_FAILED',
        resource: 'payments',
        resourceId: paymentTransaction.id,
        metadata: {
          externalId: outTradeNo,
          tradeStatus,
          reason: '支付被关闭',
        },
        success: false,
        errorMessage: '支付被关闭',
      });

        // TODO: 发送支付失败通知
        await sendPaymentNotification(paymentTransaction.orderId, 'failed');
        
        // 返回失败响应，包含跳转URL
        return createSuccessResponse(
          {
            tradeNo,
            outTradeNo,
            redirectUrl: `/payment/failure?orderId=${paymentTransaction.orderId}&paymentId=${paymentTransaction.id}&error=${encodeURIComponent('支付被关闭')}`,
          },
          '支付失败'
        );
      }

      return createSuccessResponse(null, '回调处理成功');

  } catch (error: unknown) {
    logger.error('处理支付宝回调失败', { error });
    await logAuditAction(request, {
      action: 'ALIPAY_WEBHOOK_ERROR',
      resource: 'payments',
      metadata: { error: error instanceof Error ? error.message : '未知错误' },
      success: false,
      errorMessage: error instanceof Error ? error.message : '未知错误',
    });
    return createErrorResponse(
      '处理回调失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
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
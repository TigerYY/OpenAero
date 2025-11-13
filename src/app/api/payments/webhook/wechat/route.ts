import { NextRequest, NextResponse } from 'next/server';
import { PaymentStatus, OrderStatus, PaymentEventType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { RevenueService } from '@/lib/revenue.service';
import {
  verifyWechatSignature,
  verifyWechatPaymentAmount,
  parseWechatXml,
} from '@/lib/payment/wechat-utils';
import {
  createSuccessResponse,
  createErrorResponse,
  logAuditAction,
} from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    
    // 解析微信支付回调的XML数据
    const params = parseWechatXml(body);
    const {
      return_code: returnCode,
      return_msg: returnMsg,
      result_code: resultCode,
      out_trade_no: outTradeNo,
      transaction_id: transactionId,
      total_fee: totalFee,
      time_end: timeEnd,
      openid,
      sign,
    } = params;

    logger.info('微信支付回调参数', {
      returnCode,
      resultCode,
      outTradeNo,
      transactionId,
      totalFee,
      openid,
      timeEnd,
    });

    // 验证回调数据
    if (returnCode !== 'SUCCESS') {
      logger.error('微信支付回调失败', { returnMsg });
      await logAuditAction(request, {
        action: 'WECHAT_WEBHOOK_INVALID',
        resource: 'payments',
        metadata: { returnCode, returnMsg },
        success: false,
        errorMessage: returnMsg || '回调数据错误',
      });
      return new NextResponse(
        '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[回调数据错误]]></return_msg></xml>',
        { 
          status: 400,
          headers: { 'Content-Type': 'application/xml' }
        }
      );
    }

    // 验证签名
    if (!sign) {
      logger.error('微信支付回调缺少签名');
      await logAuditAction(request, {
        action: 'WECHAT_WEBHOOK_INVALID',
        resource: 'payments',
        metadata: { reason: '缺少签名' },
        success: false,
        errorMessage: '缺少签名',
      });
      return new NextResponse(
        '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[缺少签名]]></return_msg></xml>',
        { 
          status: 400,
          headers: { 'Content-Type': 'application/xml' }
        }
      );
    }

    if (!outTradeNo) {
      logger.error('微信支付回调缺少订单号');
      await logAuditAction(request, {
        action: 'WECHAT_WEBHOOK_INVALID',
        resource: 'payments',
        metadata: { reason: '缺少订单号' },
        success: false,
        errorMessage: '缺少订单号',
      });
      return new NextResponse(
        '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[缺少订单号]]></return_msg></xml>',
        { 
          status: 400,
          headers: { 'Content-Type': 'application/xml' }
        }
      );
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
      await logAuditAction(request, {
        action: 'WECHAT_WEBHOOK_INVALID',
        resource: 'payments',
        metadata: { externalId: outTradeNo, reason: '支付记录不存在' },
        success: false,
        errorMessage: '支付记录不存在',
      });
      return new NextResponse(
        '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[支付记录不存在]]></return_msg></xml>',
        { 
          status: 404,
          headers: { 'Content-Type': 'application/xml' }
        }
      );
    }

    // 验证签名
    const wechatKey = process.env.WECHAT_PAY_KEY;
    const isValidSignature = verifyWechatSignature(params, sign, wechatKey);
    
    if (!isValidSignature) {
      logger.error('微信支付回调签名验证失败', {
        externalId: outTradeNo,
        paymentId: paymentTransaction.id,
      });
      await logAuditAction(request, {
        userId: paymentTransaction.order.userId,
        action: 'WECHAT_WEBHOOK_SIGNATURE_FAILED',
        resource: 'payments',
        resourceId: paymentTransaction.id,
        metadata: {
          externalId: outTradeNo,
          transactionId,
        },
        success: false,
        errorMessage: '签名验证失败',
      });
      return new NextResponse(
        '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[签名验证失败]]></return_msg></xml>',
        { 
          status: 400,
          headers: { 'Content-Type': 'application/xml' }
        }
      );
    }

    // 验证支付金额（微信支付金额以分为单位）
    if (totalFee) {
      const amountMatch = verifyWechatPaymentAmount(
        Number(paymentTransaction.amount),
        totalFee
      );
      if (!amountMatch) {
        logger.error('微信支付回调金额不匹配', {
          expected: paymentTransaction.amount,
          actual: totalFee,
          externalId: outTradeNo,
        });
        await logAuditAction(request, {
          userId: paymentTransaction.order.userId,
          action: 'WECHAT_WEBHOOK_AMOUNT_MISMATCH',
          resource: 'payments',
          resourceId: paymentTransaction.id,
          metadata: {
            externalId: outTradeNo,
            expectedAmount: paymentTransaction.amount,
            actualAmount: totalFee,
          },
          success: false,
          errorMessage: '支付金额不匹配',
        });
        return new NextResponse(
          '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[支付金额不匹配]]></return_msg></xml>',
          { 
            status: 400,
            headers: { 'Content-Type': 'application/xml' }
          }
        );
      }
    }

    // 创建支付事件记录
    await prisma.paymentEvent.create({
      data: {
        paymentId: paymentTransaction.id,
        eventType: 'WEBHOOK_RECEIVED',
        eventData: {
          returnCode,
          resultCode,
          transactionId,
          totalFee,
          openid,
          timeEnd,
        },
        externalEventId: transactionId,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    // 处理支付成功
    if (resultCode === 'SUCCESS') {
      if (!transactionId) {
        logger.error('微信支付回调缺少交易号');
        return new NextResponse(
          '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[缺少交易号]]></return_msg></xml>',
          { 
            status: 400,
            headers: { 'Content-Type': 'application/xml' }
          }
        );
      }

      logger.info('微信支付成功', {
        externalId: outTradeNo,
        transactionId,
        paymentId: paymentTransaction.id,
        orderId: paymentTransaction.orderId,
      });

      // 更新支付状态
      await prisma.paymentTransaction.update({
        where: { id: paymentTransaction.id },
        data: {
          status: PaymentStatus.COMPLETED,
          externalStatus: resultCode,
          paidAt: timeEnd ? new Date(timeEnd) : new Date(),
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
            transactionId,
            totalFee,
            paidAt: timeEnd,
          },
          externalEventId: transactionId,
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
        action: 'WECHAT_PAYMENT_COMPLETED',
        resource: 'payments',
        resourceId: paymentTransaction.id,
        metadata: {
          externalId: outTradeNo,
          transactionId,
          totalFee,
          openid,
        },
      });

        // TODO: 发送支付成功通知
        await sendPaymentNotification(paymentTransaction.orderId, 'success');
        
        // 注意：微信支付webhook需要返回XML格式，但可以在metadata中记录跳转URL
        // 实际跳转由前端根据支付状态查询结果决定
        
        return new NextResponse(
          '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>',
          { 
            status: 200,
            headers: { 'Content-Type': 'application/xml' }
          }
        );
    }

    // 处理支付失败
    if (resultCode === 'FAIL') {
      logger.info('微信支付失败', {
        externalId: outTradeNo,
        resultCode,
        paymentId: paymentTransaction.id,
      });

      // 更新支付状态
      await prisma.paymentTransaction.update({
        where: { id: paymentTransaction.id },
        data: {
          status: PaymentStatus.FAILED,
          externalStatus: resultCode,
          failureReason: '支付失败',
        },
      });

      // 创建支付失败事件
      await prisma.paymentEvent.create({
        data: {
          paymentId: paymentTransaction.id,
          eventType: 'FAILED',
          eventData: {
            resultCode,
            reason: '支付失败',
          },
          externalEventId: transactionId,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
        },
      });

      // 记录审计日志
      await logAuditAction(request, {
        userId: paymentTransaction.order.userId,
        action: 'WECHAT_PAYMENT_FAILED',
        resource: 'payments',
        resourceId: paymentTransaction.id,
        metadata: {
          externalId: outTradeNo,
          resultCode,
          reason: '支付失败',
        },
        success: false,
        errorMessage: '支付失败',
      });

      // TODO: 发送支付失败通知
      await sendPaymentNotification(paymentTransaction.orderId, 'failed');
    }

    return new NextResponse(
      '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>',
      { 
        status: 200,
        headers: { 'Content-Type': 'application/xml' }
      }
    );

  } catch (error: unknown) {
    logger.error('处理微信支付回调失败', { error });
    await logAuditAction(request, {
      action: 'WECHAT_WEBHOOK_ERROR',
      resource: 'payments',
      metadata: { error: error instanceof Error ? error.message : '未知错误' },
      success: false,
      errorMessage: error instanceof Error ? error.message : '未知错误',
    });
    return new NextResponse(
      '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[系统错误]]></return_msg></xml>',
      { 
        status: 500,
        headers: { 'Content-Type': 'application/xml' }
      }
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
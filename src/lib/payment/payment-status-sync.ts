/**
 * 支付状态同步服务
 * 用于查询第三方支付状态并同步到本地数据库
 */

import { PaymentStatus, OrderStatus, PaymentEventType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { RevenueService } from '@/lib/revenue.service';
import { generateAlipaySignature } from './alipay-utils';
import { generateWechatSignature } from './wechat-utils';

/**
 * 查询支付宝支付状态
 * @param externalId 外部订单号
 * @returns 支付状态信息
 */
export async function queryAlipayStatus(externalId: string): Promise<{
  status: string;
  tradeNo?: string;
  totalAmount?: string;
  failureReason?: string;
} | null> {
  try {
    const appId = process.env.ALIPAY_APP_ID;
    const privateKey = process.env.ALIPAY_PRIVATE_KEY;
    
    if (!appId || !privateKey) {
      logger.warn('支付宝配置不完整，无法查询支付状态', { externalId });
      return null;
    }

    // 构建查询请求参数
    const params: Record<string, string> = {
      app_id: appId,
      method: 'alipay.trade.query',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: new Date().toISOString().replace(/[-:T]/g, '').split('.')[0],
      version: '1.0',
      biz_content: JSON.stringify({
        out_trade_no: externalId,
      }),
    };

    // 生成签名
    const sign = generateAlipaySignature(params, privateKey);
    params.sign = sign;

    // 调用支付宝查询接口
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');

    const response = await fetch(
      `https://openapi.alipay.com/gateway.do?${queryString}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      logger.error('支付宝查询接口调用失败', {
        externalId,
        status: response.status,
      });
      return null;
    }

    const data = await response.json();
    const tradeQueryResponse = data.alipay_trade_query_response;

    if (tradeQueryResponse.code !== '10000') {
      logger.error('支付宝查询返回错误', {
        externalId,
        code: tradeQueryResponse.code,
        msg: tradeQueryResponse.msg,
      });
      return null;
    }

    return {
      status: tradeQueryResponse.trade_status,
      tradeNo: tradeQueryResponse.trade_no,
      totalAmount: tradeQueryResponse.total_amount,
      failureReason: tradeQueryResponse.trade_status === 'TRADE_CLOSED' ? '交易已关闭' : undefined,
    };
  } catch (error) {
    logger.error('查询支付宝支付状态失败', { externalId, error });
    return null;
  }
}

/**
 * 查询微信支付状态
 * @param externalId 外部订单号
 * @returns 支付状态信息
 */
export async function queryWechatStatus(externalId: string): Promise<{
  status: string;
  transactionId?: string;
  totalFee?: string;
  failureReason?: string;
} | null> {
  try {
    const appId = process.env.WECHAT_APP_ID;
    const mchId = process.env.WECHAT_MCH_ID;
    const key = process.env.WECHAT_PAY_KEY;

    if (!appId || !mchId || !key) {
      logger.warn('微信支付配置不完整，无法查询支付状态', { externalId });
      return null;
    }

    // 构建查询请求参数
    const params: Record<string, string> = {
      appid: appId,
      mch_id: mchId,
      out_trade_no: externalId,
      nonce_str: Math.random().toString(36).substring(2, 15),
    };

    // 生成签名
    const sign = generateWechatSignature(params, key);
    params.sign = sign;

    // 构建XML请求体
    const xmlBody = `<xml>
${Object.entries(params).map(([key, value]) => `  <${key}><![CDATA[${value}]]></${key}>`).join('\n')}
</xml>`;

    // 调用微信支付查询接口
    const response = await fetch(
      'https://api.mch.weixin.qq.com/pay/orderquery',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
        },
        body: xmlBody,
      }
    );

    if (!response.ok) {
      logger.error('微信支付查询接口调用失败', {
        externalId,
        status: response.status,
      });
      return null;
    }

    const xmlText = await response.text();
    
    // 简单解析XML响应
    const parseXmlValue = (xml: string, tag: string): string | null => {
      const regex = new RegExp(`<${tag}><\\!\\[CDATA\\[(.+?)\\]\\]></${tag}>`, 'i');
      const match = xml.match(regex);
      return match ? match[1] : null;
    };

    const returnCode = parseXmlValue(xmlText, 'return_code');
    const resultCode = parseXmlValue(xmlText, 'result_code');
    const tradeState = parseXmlValue(xmlText, 'trade_state');

    if (returnCode !== 'SUCCESS' || resultCode !== 'SUCCESS') {
      const errCode = parseXmlValue(xmlText, 'err_code');
      const errCodeDes = parseXmlValue(xmlText, 'err_code_des');
      logger.error('微信支付查询返回错误', {
        externalId,
        returnCode,
        resultCode,
        errCode,
        errCodeDes,
      });
      return null;
    }

    return {
      status: tradeState || 'UNKNOWN',
      transactionId: parseXmlValue(xmlText, 'transaction_id'),
      totalFee: parseXmlValue(xmlText, 'total_fee'),
      failureReason: tradeState === 'CLOSED' ? '交易已关闭' : undefined,
    };
  } catch (error) {
    logger.error('查询微信支付状态失败', { externalId, error });
    return null;
  }
}

/**
 * 同步单个支付的状态
 * @param paymentId 支付ID
 * @returns 是否成功同步
 */
export async function syncPaymentStatus(paymentId: string): Promise<boolean> {
  try {
    const payment = await prisma.paymentTransaction.findUnique({
      where: { id: paymentId },
      include: {
        order: true,
      },
    });

    if (!payment) {
      logger.error('支付记录不存在', { paymentId });
      return false;
    }

    // 只同步处理中或待支付的支付
    if (payment.status !== PaymentStatus.PROCESSING && payment.status !== PaymentStatus.PENDING) {
      return true; // 已经完成或失败，无需同步
    }

    if (!payment.externalId) {
      logger.warn('支付记录缺少外部订单号', { paymentId });
      return false;
    }

    let externalStatus: {
      status: string;
      failureReason?: string;
    } | null = null;

    // 根据支付提供商查询状态
    switch (payment.paymentProvider) {
      case 'alipay':
        externalStatus = await queryAlipayStatus(payment.externalId);
        break;
      case 'wechat':
        externalStatus = await queryWechatStatus(payment.externalId);
        break;
      default:
        logger.warn('不支持的支付提供商', {
          paymentId,
          provider: payment.paymentProvider,
        });
        return false;
    }

    if (!externalStatus) {
      logger.warn('无法获取第三方支付状态', { paymentId });
      return false;
    }

    // 映射第三方状态到本地状态
    const newStatus = mapExternalStatusToLocal(externalStatus.status);

    // 如果状态没有变化，无需更新
    if (newStatus === payment.status) {
      return true;
    }

    // 更新支付状态
    const updatedPayment = await prisma.paymentTransaction.update({
      where: { id: paymentId },
      data: {
        status: newStatus,
        externalStatus: externalStatus.status,
        paidAt: newStatus === PaymentStatus.COMPLETED ? new Date() : null,
        failureReason: externalStatus.failureReason,
        updatedAt: new Date(),
      },
    });

    // 创建状态变更事件
    await prisma.paymentEvent.create({
      data: {
        paymentId: paymentId,
        eventType: 'STATUS_CHANGED',
        eventData: {
          oldStatus: payment.status,
          newStatus: newStatus,
          externalStatus: externalStatus.status,
        },
        ipAddress: 'system',
        userAgent: 'payment-sync-service',
      },
    });

    // 如果支付成功，更新订单状态并处理收益分成
    if (newStatus === PaymentStatus.COMPLETED) {
      await prisma.order.update({
        where: { id: payment.orderId },
        data: {
          status: OrderStatus.CONFIRMED,
          updatedAt: new Date(),
        },
      });

      try {
        await RevenueService.processRevenueShare(payment.orderId, paymentId);
        logger.info('收益分成处理成功', {
          orderId: payment.orderId,
          paymentId: paymentId,
        });
      } catch (error) {
        logger.error('收益分成处理失败', {
          orderId: payment.orderId,
          paymentId: paymentId,
          error,
        });
      }
    }

    logger.info('支付状态同步成功', {
      paymentId,
      oldStatus: payment.status,
      newStatus,
      externalStatus: externalStatus.status,
    });

    return true;
  } catch (error) {
    logger.error('同步支付状态失败', { paymentId, error });
    return false;
  }
}

/**
 * 批量同步支付状态
 * @param limit 每次同步的数量限制
 * @returns 同步结果统计
 */
export async function syncPendingPayments(limit: number = 50): Promise<{
  total: number;
  synced: number;
  failed: number;
}> {
  try {
    // 查找需要同步的支付记录（处理中或待支付，且创建时间在24小时内）
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const pendingPayments = await prisma.paymentTransaction.findMany({
      where: {
        status: {
          in: [PaymentStatus.PROCESSING, PaymentStatus.PENDING],
        },
        externalId: {
          not: null,
        },
        createdAt: {
          gte: oneDayAgo,
        },
      },
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    let synced = 0;
    let failed = 0;

    for (const payment of pendingPayments) {
      const success = await syncPaymentStatus(payment.id);
      if (success) {
        synced++;
      } else {
        failed++;
      }
    }

    logger.info('批量同步支付状态完成', {
      total: pendingPayments.length,
      synced,
      failed,
    });

    return {
      total: pendingPayments.length,
      synced,
      failed,
    };
  } catch (error) {
    logger.error('批量同步支付状态失败', { error });
    return {
      total: 0,
      synced: 0,
      failed: 0,
    };
  }
}

/**
 * 将第三方状态映射到本地状态
 */
function mapExternalStatusToLocal(externalStatus: string): PaymentStatus {
  switch (externalStatus) {
    case 'TRADE_SUCCESS':
    case 'TRADE_FINISHED':
    case 'SUCCESS':
      return PaymentStatus.COMPLETED;
    case 'TRADE_CLOSED':
    case 'CLOSED':
      return PaymentStatus.CANCELLED;
    case 'WAIT_BUYER_PAY':
    case 'NOTPAY':
      return PaymentStatus.PENDING;
    case 'TRADE_PENDING':
      return PaymentStatus.PROCESSING;
    default:
      return PaymentStatus.FAILED;
  }
}


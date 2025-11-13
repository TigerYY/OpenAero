/**
 * 支付安全验证工具
 * 提供CSRF保护、金额验证、重复支付检查、频率限制等安全功能
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import { logger } from '@/lib/logger';
import { getRequestIp } from '@/lib/api-helpers';

// 支付频率限制配置
const PAYMENT_RATE_LIMIT = {
  // 每分钟最多创建支付次数
  MAX_PAYMENTS_PER_MINUTE: 5,
  // 每小时最多创建支付次数
  MAX_PAYMENTS_PER_HOUR: 20,
  // 每天最多创建支付次数
  MAX_PAYMENTS_PER_DAY: 50,
};

/**
 * 验证CSRF保护
 * 检查Origin和Referer头，确保请求来自同一域名
 */
export function verifyCsrfProtection(request: NextRequest): { valid: boolean; error?: string } {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');

  // 允许来自相同域名的请求
  if (origin && host) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.hostname === host) {
        return { valid: true };
      }
    } catch (error) {
      // URL解析失败，继续检查referer
    }
  }

  if (referer && host) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.hostname === host) {
        return { valid: true };
      }
    } catch (error) {
      // URL解析失败
    }
  }

  // 开发环境允许localhost
  if (process.env.NODE_ENV === 'development') {
    if (host?.includes('localhost') || host?.includes('127.0.0.1')) {
      return { valid: true };
    }
  }

  return {
    valid: false,
    error: 'CSRF验证失败：请求来源不合法',
  };
}

/**
 * 验证支付金额
 * 确保支付金额与解决方案价格一致（允许0.01的误差）
 */
export function verifyPaymentAmount(
  requestedAmount: number,
  solutionPrice: number
): { valid: boolean; error?: string } {
  if (requestedAmount <= 0) {
    return {
      valid: false,
      error: '支付金额必须大于0',
    };
  }

  if (requestedAmount > solutionPrice * 10) {
    // 防止金额异常过大（超过原价10倍）
    return {
      valid: false,
      error: '支付金额异常，请检查',
    };
  }

  // 允许0.01的误差（用于浮点数精度问题）
  const difference = Math.abs(requestedAmount - solutionPrice);
  if (difference > 0.01) {
    return {
      valid: false,
      error: `支付金额与商品价格不一致（商品价格：${solutionPrice}，支付金额：${requestedAmount}）`,
    };
  }

  return { valid: true };
}

/**
 * 检查重复支付
 * 检查订单是否已有成功的支付记录
 */
export async function checkDuplicatePayment(
  orderId: string
): Promise<{ hasDuplicate: boolean; error?: string }> {
  const existingPayment = await prisma.paymentTransaction.findFirst({
    where: {
      orderId,
      status: PaymentStatus.COMPLETED,
    },
  });

  if (existingPayment) {
    return {
      hasDuplicate: true,
      error: '该订单已完成支付，请勿重复支付',
    };
  }

  return { hasDuplicate: false };
}

/**
 * 检查支付频率限制
 * 防止恶意刷单和频繁创建支付
 */
export async function checkPaymentRateLimit(
  userId: string,
  ipAddress: string
): Promise<{ allowed: boolean; error?: string; retryAfter?: number }> {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // 检查每分钟限制（按用户ID）
  const paymentsLastMinuteByUser = await prisma.paymentTransaction.count({
    where: {
      order: { userId },
      createdAt: { gte: oneMinuteAgo },
      status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
    },
  });

  // 检查每分钟限制（按IP地址，需要查询metadata）
  const allPaymentsLastMinute = await prisma.paymentTransaction.findMany({
    where: {
      createdAt: { gte: oneMinuteAgo },
      status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
    },
    select: { metadata: true },
  });

  const paymentsLastMinuteByIp = allPaymentsLastMinute.filter((p) => {
    const metadata = p.metadata as { ip?: string } | null;
    return metadata?.ip === ipAddress;
  }).length;

  const paymentsLastMinute = Math.max(paymentsLastMinuteByUser, paymentsLastMinuteByIp);

  if (paymentsLastMinute >= PAYMENT_RATE_LIMIT.MAX_PAYMENTS_PER_MINUTE) {
    return {
      allowed: false,
      error: `支付频率过高，请稍后再试（每分钟最多${PAYMENT_RATE_LIMIT.MAX_PAYMENTS_PER_MINUTE}次）`,
      retryAfter: 60,
    };
  }

  // 检查每小时限制（按用户ID）
  const paymentsLastHourByUser = await prisma.paymentTransaction.count({
    where: {
      order: { userId },
      createdAt: { gte: oneHourAgo },
      status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
    },
  });

  // 检查每小时限制（按IP地址）
  const allPaymentsLastHour = await prisma.paymentTransaction.findMany({
    where: {
      createdAt: { gte: oneHourAgo },
      status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
    },
    select: { metadata: true },
  });

  const paymentsLastHourByIp = allPaymentsLastHour.filter((p) => {
    const metadata = p.metadata as { ip?: string } | null;
    return metadata?.ip === ipAddress;
  }).length;

  const paymentsLastHour = Math.max(paymentsLastHourByUser, paymentsLastHourByIp);

  if (paymentsLastHour >= PAYMENT_RATE_LIMIT.MAX_PAYMENTS_PER_HOUR) {
    return {
      allowed: false,
      error: `支付频率过高，请稍后再试（每小时最多${PAYMENT_RATE_LIMIT.MAX_PAYMENTS_PER_HOUR}次）`,
      retryAfter: 3600,
    };
  }

  // 检查每天限制（按用户ID）
  const paymentsLastDayByUser = await prisma.paymentTransaction.count({
    where: {
      order: { userId },
      createdAt: { gte: oneDayAgo },
      status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
    },
  });

  // 检查每天限制（按IP地址）
  const allPaymentsLastDay = await prisma.paymentTransaction.findMany({
    where: {
      createdAt: { gte: oneDayAgo },
      status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
    },
    select: { metadata: true },
  });

  const paymentsLastDayByIp = allPaymentsLastDay.filter((p) => {
    const metadata = p.metadata as { ip?: string } | null;
    return metadata?.ip === ipAddress;
  }).length;

  const paymentsLastDay = Math.max(paymentsLastDayByUser, paymentsLastDayByIp);

  if (paymentsLastDay >= PAYMENT_RATE_LIMIT.MAX_PAYMENTS_PER_DAY) {
    return {
      allowed: false,
      error: `支付频率过高，请稍后再试（每天最多${PAYMENT_RATE_LIMIT.MAX_PAYMENTS_PER_DAY}次）`,
      retryAfter: 86400,
    };
  }

  return { allowed: true };
}

/**
 * 验证订单状态
 * 确保订单状态允许支付
 */
export async function verifyOrderStatus(
  orderId: string
): Promise<{ valid: boolean; error?: string }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });

  if (!order) {
    return {
      valid: false,
      error: '订单不存在',
    };
  }

  if (order.status !== OrderStatus.PENDING) {
    return {
      valid: false,
      error: `订单状态不允许支付（当前状态：${order.status}）`,
    };
  }

  return { valid: true };
}

/**
 * 综合支付安全验证
 * 一次性执行所有安全检查
 */
export async function validatePaymentSecurity(
  request: NextRequest,
  options: {
    userId: string;
    orderId?: string;
    solutionId?: string;
    requestedAmount: number;
    solutionPrice?: number;
  }
): Promise<{ valid: boolean; error?: string; retryAfter?: number }> {
  const { userId, orderId, solutionId, requestedAmount, solutionPrice } = options;
  const ipAddress = getRequestIp(request);

  // 1. CSRF保护
  const csrfCheck = verifyCsrfProtection(request);
  if (!csrfCheck.valid) {
    logger.warn('支付CSRF验证失败', {
      userId,
      ipAddress,
      orderId,
      solutionId,
    });
    return { valid: false, error: csrfCheck.error };
  }

  // 2. 支付金额验证
  if (solutionPrice !== undefined) {
    const amountCheck = verifyPaymentAmount(requestedAmount, solutionPrice);
    if (!amountCheck.valid) {
      logger.warn('支付金额验证失败', {
        userId,
        ipAddress,
        orderId,
        solutionId,
        requestedAmount,
        solutionPrice,
      });
      return { valid: false, error: amountCheck.error };
    }
  }

  // 3. 重复支付检查（如果有orderId）
  if (orderId) {
    const duplicateCheck = await checkDuplicatePayment(orderId);
    if (duplicateCheck.hasDuplicate) {
      logger.warn('检测到重复支付', {
        userId,
        ipAddress,
        orderId,
      });
      return { valid: false, error: duplicateCheck.error };
    }

    // 4. 订单状态验证
    const orderStatusCheck = await verifyOrderStatus(orderId);
    if (!orderStatusCheck.valid) {
      logger.warn('订单状态验证失败', {
        userId,
        ipAddress,
        orderId,
      });
      return { valid: false, error: orderStatusCheck.error };
    }
  }

  // 5. 支付频率限制
  const rateLimitCheck = await checkPaymentRateLimit(userId, ipAddress);
  if (!rateLimitCheck.allowed) {
    logger.warn('支付频率限制触发', {
      userId,
      ipAddress,
      orderId,
      solutionId,
      retryAfter: rateLimitCheck.retryAfter,
    });
    return {
      valid: false,
      error: rateLimitCheck.error,
      retryAfter: rateLimitCheck.retryAfter,
    };
  }

  return { valid: true };
}


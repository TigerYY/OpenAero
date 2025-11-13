/**
 * 支付状态同步服务测试
 */

import {
  queryAlipayStatus,
  queryWechatStatus,
  syncPaymentStatus,
  syncPendingPayments,
} from '@/lib/payment/payment-status-sync';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { RevenueService } from '@/lib/revenue.service';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    paymentTransaction: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    order: {
      update: jest.fn(),
    },
    paymentEvent: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/revenue.service', () => ({
  RevenueService: {
    processRevenueShare: jest.fn(),
  },
}));

jest.mock('@/lib/payment/alipay-utils', () => ({
  generateAlipaySignature: jest.fn(() => 'mock-signature'),
}));

jest.mock('@/lib/payment/wechat-utils', () => ({
  generateWechatSignature: jest.fn(() => 'MOCK_SIGNATURE'),
}));

// Mock fetch
global.fetch = jest.fn();

describe('Payment Status Sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ALIPAY_APP_ID = 'test-app-id';
    process.env.ALIPAY_PRIVATE_KEY = 'test-private-key';
    process.env.WECHAT_APP_ID = 'test-wechat-app-id';
    process.env.WECHAT_MCH_ID = 'test-mch-id';
    process.env.WECHAT_PAY_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.ALIPAY_APP_ID;
    delete process.env.ALIPAY_PRIVATE_KEY;
    delete process.env.WECHAT_APP_ID;
    delete process.env.WECHAT_MCH_ID;
    delete process.env.WECHAT_PAY_KEY;
  });

  describe('queryAlipayStatus', () => {
    it('应该返回null如果配置不完整', async () => {
      delete process.env.ALIPAY_APP_ID;
      const result = await queryAlipayStatus('test-external-id');
      expect(result).toBeNull();
    });

    it('应该查询支付宝支付状态', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          alipay_trade_query_response: {
            code: '10000',
            trade_status: 'TRADE_SUCCESS',
            trade_no: 'trade-123',
            total_amount: '100.00',
          },
        }),
      });

      const result = await queryAlipayStatus('test-external-id');
      expect(result).toBeDefined();
      expect(result?.status).toBe('TRADE_SUCCESS');
      expect(result?.tradeNo).toBe('trade-123');
      expect(result?.totalAmount).toBe('100.00');
    });

    it('应该处理支付宝API错误', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          alipay_trade_query_response: {
            code: '40004',
            msg: 'Business Failed',
          },
        }),
      });

      const result = await queryAlipayStatus('test-external-id');
      expect(result).toBeNull();
    });
  });

  describe('queryWechatStatus', () => {
    it('应该返回null如果配置不完整', async () => {
      delete process.env.WECHAT_APP_ID;
      const result = await queryWechatStatus('test-external-id');
      expect(result).toBeNull();
    });

    it('应该查询微信支付状态', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => `<xml>
          <return_code><![CDATA[SUCCESS]]></return_code>
          <result_code><![CDATA[SUCCESS]]></result_code>
          <trade_state><![CDATA[SUCCESS]]></trade_state>
          <transaction_id><![CDATA[trans-123]]></transaction_id>
          <total_fee><![CDATA[10000]]></total_fee>
        </xml>`,
      });

      const result = await queryWechatStatus('test-external-id');
      expect(result).toBeDefined();
      expect(result?.status).toBe('SUCCESS');
      expect(result?.transactionId).toBe('trans-123');
      expect(result?.totalFee).toBe('10000');
    });

    it('应该处理微信支付API错误', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => `<xml>
          <return_code><![CDATA[FAIL]]></return_code>
          <return_msg><![CDATA[系统错误]]></return_msg>
        </xml>`,
      });

      const result = await queryWechatStatus('test-external-id');
      expect(result).toBeNull();
    });
  });

  describe('syncPaymentStatus', () => {
    const mockPayment = {
      id: 'payment-1',
      status: PaymentStatus.PROCESSING,
      externalId: 'external-123',
      paymentProvider: 'alipay',
      orderId: 'order-1',
      order: {
        id: 'order-1',
        userId: 'user-1',
      },
    };

    it('应该返回false如果支付记录不存在', async () => {
      (prisma.paymentTransaction.findUnique as jest.Mock).mockResolvedValueOnce(null);
      const result = await syncPaymentStatus('non-existent');
      expect(result).toBe(false);
    });

    it('应该跳过已完成的支付', async () => {
      (prisma.paymentTransaction.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
      });
      const result = await syncPaymentStatus('payment-1');
      expect(result).toBe(true);
      expect(prisma.paymentTransaction.update).not.toHaveBeenCalled();
    });

    it('应该同步支付状态并更新订单', async () => {
      (prisma.paymentTransaction.findUnique as jest.Mock).mockResolvedValueOnce(mockPayment);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          alipay_trade_query_response: {
            code: '10000',
            trade_status: 'TRADE_SUCCESS',
          },
        }),
      });
      (prisma.paymentTransaction.update as jest.Mock).mockResolvedValueOnce({
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
      });
      (prisma.paymentEvent.create as jest.Mock).mockResolvedValueOnce({});
      (prisma.order.update as jest.Mock).mockResolvedValueOnce({});
      (RevenueService.processRevenueShare as jest.Mock).mockResolvedValueOnce({});

      const result = await syncPaymentStatus('payment-1');
      expect(result).toBe(true);
      expect(prisma.paymentTransaction.update).toHaveBeenCalled();
      expect(prisma.order.update).toHaveBeenCalled();
      expect(RevenueService.processRevenueShare).toHaveBeenCalled();
    });

    it('应该处理同步失败', async () => {
      (prisma.paymentTransaction.findUnique as jest.Mock).mockResolvedValueOnce(mockPayment);
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await syncPaymentStatus('payment-1');
      expect(result).toBe(false);
    });
  });

  describe('syncPendingPayments', () => {
    const mockPayments = [
      {
        id: 'payment-1',
        status: PaymentStatus.PROCESSING,
        externalId: 'external-123',
        paymentProvider: 'alipay',
        orderId: 'order-1',
        createdAt: new Date(),
      },
      {
        id: 'payment-2',
        status: PaymentStatus.PENDING,
        externalId: 'external-456',
        paymentProvider: 'wechat',
        orderId: 'order-2',
        createdAt: new Date(),
      },
    ];

    it('应该批量同步支付状态', async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      (prisma.paymentTransaction.findMany as jest.Mock).mockResolvedValueOnce(mockPayments);
      
      // Mock syncPaymentStatus for each payment
      (prisma.paymentTransaction.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          ...mockPayments[0],
          order: { id: 'order-1', userId: 'user-1' },
        })
        .mockResolvedValueOnce({
          ...mockPayments[1],
          order: { id: 'order-2', userId: 'user-2' },
        });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            alipay_trade_query_response: {
              code: '10000',
              trade_status: 'TRADE_SUCCESS',
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => `<xml>
            <return_code><![CDATA[SUCCESS]]></return_code>
            <result_code><![CDATA[SUCCESS]]></result_code>
            <trade_state><![CDATA[SUCCESS]]></trade_state>
          </xml>`,
        });

      (prisma.paymentTransaction.update as jest.Mock)
        .mockResolvedValueOnce({ ...mockPayments[0], status: PaymentStatus.COMPLETED })
        .mockResolvedValueOnce({ ...mockPayments[1], status: PaymentStatus.COMPLETED });

      (prisma.paymentEvent.create as jest.Mock).mockResolvedValue({});
      (prisma.order.update as jest.Mock).mockResolvedValue({});
      (RevenueService.processRevenueShare as jest.Mock).mockResolvedValue({});

      const result = await syncPendingPayments(50);
      expect(result.total).toBe(2);
      expect(result.synced).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('应该处理同步失败', async () => {
      (prisma.paymentTransaction.findMany as jest.Mock).mockResolvedValueOnce(mockPayments);
      (prisma.paymentTransaction.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await syncPendingPayments(50);
      expect(result.total).toBe(2);
      expect(result.synced).toBe(0);
      expect(result.failed).toBe(2);
    });
  });
});


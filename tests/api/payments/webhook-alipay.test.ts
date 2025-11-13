/**
 * 支付宝Webhook API测试
 */

import { POST } from '@/app/api/payments/webhook/alipay/route';
import { NextRequest } from 'next/server';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyAlipaySignature, verifyPaymentAmount } from '@/lib/payment/alipay-utils';
import { RevenueService } from '@/lib/revenue.service';
import { logAuditAction } from '@/lib/api-helpers';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    paymentTransaction: {
      findFirst: jest.fn(),
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

jest.mock('@/lib/payment/alipay-utils', () => ({
  verifyAlipaySignature: jest.fn(),
  verifyPaymentAmount: jest.fn(),
}));

jest.mock('@/lib/revenue.service', () => ({
  RevenueService: {
    processRevenueShare: jest.fn(),
  },
}));

jest.mock('@/lib/api-helpers', () => ({
  createSuccessResponse: jest.fn((data, message) => ({
    success: true,
    data,
    message,
  })),
  createErrorResponse: jest.fn((message, status, error) => ({
    success: false,
    message,
    status,
    error,
  })),
  logAuditAction: jest.fn(),
}));

describe('Alipay Webhook API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ALIPAY_PUBLIC_KEY = 'test-public-key';
  });

  afterEach(() => {
    delete process.env.ALIPAY_PUBLIC_KEY;
  });

  const createMockRequest = (body: string) => {
    return {
      text: jest.fn().mockResolvedValue(body),
      headers: {
        get: jest.fn((name: string) => {
          if (name === 'x-forwarded-for') return '127.0.0.1';
          if (name === 'user-agent') return 'test-agent';
          return null;
        }),
      },
    } as unknown as NextRequest;
  };

  const mockPaymentTransaction = {
    id: 'payment-1',
    amount: 100.0,
    status: PaymentStatus.PROCESSING,
    externalId: 'external-123',
    orderId: 'order-1',
    order: {
      id: 'order-1',
      userId: 'user-1',
      orderSolutions: [],
    },
  };

  describe('POST /api/payments/webhook/alipay', () => {
    it('应该拒绝缺少签名的请求', async () => {
      const body = 'trade_status=TRADE_SUCCESS&out_trade_no=external-123';
      const request = createMockRequest(body);

      (prisma.paymentTransaction.findFirst as jest.Mock).mockResolvedValueOnce(
        mockPaymentTransaction
      );

      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.message).toContain('缺少签名');
    });

    it('应该拒绝缺少外部订单号的请求', async () => {
      const body = 'trade_status=TRADE_SUCCESS&sign=test-sign';
      const request = createMockRequest(body);

      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.message).toContain('缺少外部订单号');
    });

    it('应该拒绝支付记录不存在的请求', async () => {
      const body = 'trade_status=TRADE_SUCCESS&out_trade_no=external-123&sign=test-sign';
      const request = createMockRequest(body);

      (prisma.paymentTransaction.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.message).toContain('支付记录不存在');
    });

    it('应该拒绝签名验证失败的请求', async () => {
      const body = 'trade_status=TRADE_SUCCESS&out_trade_no=external-123&sign=test-sign';
      const request = createMockRequest(body);

      (prisma.paymentTransaction.findFirst as jest.Mock).mockResolvedValueOnce(
        mockPaymentTransaction
      );
      (verifyAlipaySignature as jest.Mock).mockReturnValueOnce(false);

      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.message).toContain('签名验证失败');
    });

    it('应该拒绝金额不匹配的请求', async () => {
      const body =
        'trade_status=TRADE_SUCCESS&out_trade_no=external-123&total_amount=200.00&sign=test-sign';
      const request = createMockRequest(body);

      (prisma.paymentTransaction.findFirst as jest.Mock).mockResolvedValueOnce(
        mockPaymentTransaction
      );
      (verifyAlipaySignature as jest.Mock).mockReturnValueOnce(true);
      (verifyPaymentAmount as jest.Mock).mockReturnValueOnce(false);

      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.message).toContain('支付金额不匹配');
    });

    it('应该处理支付成功的回调', async () => {
      const body =
        'trade_status=TRADE_SUCCESS&out_trade_no=external-123&trade_no=trade-123&total_amount=100.00&sign=test-sign';
      const request = createMockRequest(body);

      (prisma.paymentTransaction.findFirst as jest.Mock).mockResolvedValueOnce(
        mockPaymentTransaction
      );
      (verifyAlipaySignature as jest.Mock).mockReturnValueOnce(true);
      (verifyPaymentAmount as jest.Mock).mockReturnValueOnce(true);
      (prisma.paymentTransaction.update as jest.Mock).mockResolvedValueOnce({
        ...mockPaymentTransaction,
        status: PaymentStatus.COMPLETED,
      });
      (prisma.order.update as jest.Mock).mockResolvedValueOnce({});
      (prisma.paymentEvent.create as jest.Mock).mockResolvedValue({});
      (RevenueService.processRevenueShare as jest.Mock).mockResolvedValue({});

      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(prisma.paymentTransaction.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: {
          status: PaymentStatus.COMPLETED,
          externalStatus: 'TRADE_SUCCESS',
          paidAt: expect.any(Date),
        },
      });
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: {
          status: OrderStatus.CONFIRMED,
        },
      });
      expect(RevenueService.processRevenueShare).toHaveBeenCalledWith('order-1', 'payment-1');
    });

    it('应该处理支付失败的回调', async () => {
      const body =
        'trade_status=TRADE_CLOSED&out_trade_no=external-123&sign=test-sign';
      const request = createMockRequest(body);

      (prisma.paymentTransaction.findFirst as jest.Mock).mockResolvedValueOnce(
        mockPaymentTransaction
      );
      (verifyAlipaySignature as jest.Mock).mockReturnValueOnce(true);
      (prisma.paymentTransaction.update as jest.Mock).mockResolvedValueOnce({
        ...mockPaymentTransaction,
        status: PaymentStatus.FAILED,
      });
      (prisma.paymentEvent.create as jest.Mock).mockResolvedValue({});

      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(prisma.paymentTransaction.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: {
          status: PaymentStatus.FAILED,
          externalStatus: 'TRADE_CLOSED',
          failureReason: '支付被关闭',
        },
      });
    });
  });
});


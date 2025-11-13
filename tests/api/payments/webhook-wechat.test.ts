/**
 * 微信支付Webhook API测试
 */

import { POST } from '@/app/api/payments/webhook/wechat/route';
import { NextRequest } from 'next/server';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  verifyWechatSignature,
  verifyWechatPaymentAmount,
  parseWechatXml,
} from '@/lib/payment/wechat-utils';
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

jest.mock('@/lib/payment/wechat-utils', () => ({
  verifyWechatSignature: jest.fn(),
  verifyWechatPaymentAmount: jest.fn(),
  parseWechatXml: jest.fn(),
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

describe('Wechat Pay Webhook API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WECHAT_PAY_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.WECHAT_PAY_KEY;
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

  describe('POST /api/payments/webhook/wechat', () => {
    const mockXmlBody = `<xml>
      <return_code><![CDATA[SUCCESS]]></return_code>
      <result_code><![CDATA[SUCCESS]]></result_code>
      <out_trade_no><![CDATA[external-123]]></out_trade_no>
      <transaction_id><![CDATA[trans-123]]></transaction_id>
      <total_fee><![CDATA[10000]]></total_fee>
      <sign><![CDATA[test-sign]]></sign>
    </xml>`;

    it('应该拒绝return_code为FAIL的请求', async () => {
      const xmlBody = `<xml>
        <return_code><![CDATA[FAIL]]></return_code>
        <return_msg><![CDATA[系统错误]]></return_msg>
      </xml>`;
      const request = createMockRequest(xmlBody);

      (parseWechatXml as jest.Mock).mockReturnValueOnce({
        return_code: 'FAIL',
        return_msg: '系统错误',
      });

      const response = await POST(request);
      const text = await response.text();

      expect(text).toContain('FAIL');
      expect(text).toContain('回调数据错误');
    });

    it('应该拒绝缺少签名的请求', async () => {
      const xmlBody = `<xml>
        <return_code><![CDATA[SUCCESS]]></return_code>
        <result_code><![CDATA[SUCCESS]]></result_code>
        <out_trade_no><![CDATA[external-123]]></out_trade_no>
      </xml>`;
      const request = createMockRequest(xmlBody);

      (parseWechatXml as jest.Mock).mockReturnValueOnce({
        return_code: 'SUCCESS',
        result_code: 'SUCCESS',
        out_trade_no: 'external-123',
      });

      const response = await POST(request);
      const text = await response.text();

      expect(text).toContain('FAIL');
      expect(text).toContain('缺少签名');
    });

    it('应该拒绝支付记录不存在的请求', async () => {
      const request = createMockRequest(mockXmlBody);

      (parseWechatXml as jest.Mock).mockReturnValueOnce({
        return_code: 'SUCCESS',
        result_code: 'SUCCESS',
        out_trade_no: 'external-123',
        sign: 'test-sign',
      });
      (prisma.paymentTransaction.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const response = await POST(request);
      const text = await response.text();

      expect(text).toContain('FAIL');
      expect(text).toContain('支付记录不存在');
    });

    it('应该拒绝签名验证失败的请求', async () => {
      const request = createMockRequest(mockXmlBody);

      (parseWechatXml as jest.Mock).mockReturnValueOnce({
        return_code: 'SUCCESS',
        result_code: 'SUCCESS',
        out_trade_no: 'external-123',
        sign: 'test-sign',
      });
      (prisma.paymentTransaction.findFirst as jest.Mock).mockResolvedValueOnce(
        mockPaymentTransaction
      );
      (verifyWechatSignature as jest.Mock).mockReturnValueOnce(false);

      const response = await POST(request);
      const text = await response.text();

      expect(text).toContain('FAIL');
      expect(text).toContain('签名验证失败');
    });

    it('应该拒绝金额不匹配的请求', async () => {
      const request = createMockRequest(mockXmlBody);

      (parseWechatXml as jest.Mock).mockReturnValueOnce({
        return_code: 'SUCCESS',
        result_code: 'SUCCESS',
        out_trade_no: 'external-123',
        total_fee: '20000',
        sign: 'test-sign',
      });
      (prisma.paymentTransaction.findFirst as jest.Mock).mockResolvedValueOnce(
        mockPaymentTransaction
      );
      (verifyWechatSignature as jest.Mock).mockReturnValueOnce(true);
      (verifyWechatPaymentAmount as jest.Mock).mockReturnValueOnce(false);

      const response = await POST(request);
      const text = await response.text();

      expect(text).toContain('FAIL');
      expect(text).toContain('支付金额不匹配');
    });

    it('应该处理支付成功的回调', async () => {
      const request = createMockRequest(mockXmlBody);

      (parseWechatXml as jest.Mock).mockReturnValueOnce({
        return_code: 'SUCCESS',
        result_code: 'SUCCESS',
        out_trade_no: 'external-123',
        transaction_id: 'trans-123',
        total_fee: '10000',
        sign: 'test-sign',
      });
      (prisma.paymentTransaction.findFirst as jest.Mock).mockResolvedValueOnce(
        mockPaymentTransaction
      );
      (verifyWechatSignature as jest.Mock).mockReturnValueOnce(true);
      (verifyWechatPaymentAmount as jest.Mock).mockReturnValueOnce(true);
      (prisma.paymentTransaction.update as jest.Mock).mockResolvedValueOnce({
        ...mockPaymentTransaction,
        status: PaymentStatus.COMPLETED,
      });
      (prisma.order.update as jest.Mock).mockResolvedValueOnce({});
      (prisma.paymentEvent.create as jest.Mock).mockResolvedValue({});
      (RevenueService.processRevenueShare as jest.Mock).mockResolvedValue({});

      const response = await POST(request);
      const text = await response.text();

      expect(text).toContain('SUCCESS');
      expect(prisma.paymentTransaction.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: {
          status: PaymentStatus.COMPLETED,
          externalStatus: 'SUCCESS',
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
      const xmlBody = `<xml>
        <return_code><![CDATA[SUCCESS]]></return_code>
        <result_code><![CDATA[FAIL]]></result_code>
        <out_trade_no><![CDATA[external-123]]></out_trade_no>
        <sign><![CDATA[test-sign]]></sign>
      </xml>`;
      const request = createMockRequest(xmlBody);

      (parseWechatXml as jest.Mock).mockReturnValueOnce({
        return_code: 'SUCCESS',
        result_code: 'FAIL',
        out_trade_no: 'external-123',
        sign: 'test-sign',
      });
      (prisma.paymentTransaction.findFirst as jest.Mock).mockResolvedValueOnce(
        mockPaymentTransaction
      );
      (verifyWechatSignature as jest.Mock).mockReturnValueOnce(true);
      (prisma.paymentTransaction.update as jest.Mock).mockResolvedValueOnce({
        ...mockPaymentTransaction,
        status: PaymentStatus.FAILED,
      });
      (prisma.paymentEvent.create as jest.Mock).mockResolvedValue({});

      const response = await POST(request);
      const text = await response.text();

      expect(text).toContain('SUCCESS');
      expect(prisma.paymentTransaction.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: {
          status: PaymentStatus.FAILED,
          externalStatus: 'FAIL',
          failureReason: '支付失败',
        },
      });
    });
  });
});


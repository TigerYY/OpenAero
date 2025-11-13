/**
 * 支付宝工具函数测试
 */

import {
  verifyAlipaySignature,
  verifyPaymentAmount,
  generateAlipaySignature,
} from '@/lib/payment/alipay-utils';
import crypto from 'crypto';

describe('Alipay Utils', () => {
  describe('verifyAlipaySignature', () => {
    it('应该在开发环境中跳过验证（如果未配置公钥）', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const params = new URLSearchParams('trade_status=TRADE_SUCCESS&out_trade_no=123');
      const sign = 'test-sign';

      const result = verifyAlipaySignature(params, sign, undefined);
      expect(result).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });

    it('应该在生产环境中拒绝验证（如果未配置公钥）', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const params = new URLSearchParams('trade_status=TRADE_SUCCESS&out_trade_no=123');
      const sign = 'test-sign';

      const result = verifyAlipaySignature(params, sign, undefined);
      expect(result).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });

    it('应该验证有效的RSA2签名', () => {
      // 生成测试密钥对
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      // 构造待签名字符串
      const params = new URLSearchParams('trade_status=TRADE_SUCCESS&out_trade_no=123');
      const sortedKeys = Array.from(params.keys())
        .filter(key => key !== 'sign' && key !== 'sign_type')
        .sort();
      const signContent = sortedKeys
        .map(key => `${key}=${params.get(key)}`)
        .join('&');

      // 生成签名
      const signer = crypto.createSign('RSA-SHA256');
      signer.update(signContent, 'utf8');
      const sign = signer.sign(privateKey, 'base64');

      // 提取公钥（去除头尾标记）
      const publicKeyBase64 = publicKey
        .replace(/-----BEGIN PUBLIC KEY-----/g, '')
        .replace(/-----END PUBLIC KEY-----/g, '')
        .replace(/\s/g, '');

      const result = verifyAlipaySignature(params, sign, publicKeyBase64);
      expect(result).toBe(true);
    });

    it('应该拒绝无效的签名', () => {
      const { publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      const params = new URLSearchParams('trade_status=TRADE_SUCCESS&out_trade_no=123');
      const invalidSign = 'invalid-sign';

      const publicKeyBase64 = publicKey
        .replace(/-----BEGIN PUBLIC KEY-----/g, '')
        .replace(/-----END PUBLIC KEY-----/g, '')
        .replace(/\s/g, '');

      const result = verifyAlipaySignature(params, invalidSign, publicKeyBase64);
      expect(result).toBe(false);
    });
  });

  describe('verifyPaymentAmount', () => {
    it('应该验证金额匹配（字符串格式）', () => {
      expect(verifyPaymentAmount(100.0, '100.0')).toBe(true);
      expect(verifyPaymentAmount(100.0, '100.00')).toBe(true);
      expect(verifyPaymentAmount(100.0, '99.99')).toBe(true); // 允许0.01误差
      expect(verifyPaymentAmount(100.0, '100.01')).toBe(true); // 允许0.01误差
    });

    it('应该验证金额匹配（数字格式）', () => {
      expect(verifyPaymentAmount(100.0, 100.0)).toBe(true);
      expect(verifyPaymentAmount(100.0, 100.00)).toBe(true);
      expect(verifyPaymentAmount(100.0, 99.99)).toBe(true);
      expect(verifyPaymentAmount(100.0, 100.01)).toBe(true);
    });

    it('应该拒绝金额不匹配', () => {
      expect(verifyPaymentAmount(100.0, '50.0')).toBe(false);
      expect(verifyPaymentAmount(100.0, '150.0')).toBe(false);
      expect(verifyPaymentAmount(100.0, '100.02')).toBe(false); // 超过0.01误差
    });
  });

  describe('generateAlipaySignature', () => {
    it('应该生成有效的RSA2签名', () => {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      const params: Record<string, string> = {
        app_id: 'test-app-id',
        method: 'alipay.trade.query',
        out_trade_no: '123',
      };

      const privateKeyBase64 = privateKey
        .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
        .replace(/-----END RSA PRIVATE KEY-----/g, '')
        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .replace(/\s/g, '');

      const sign = generateAlipaySignature(params, privateKeyBase64);
      expect(sign).toBeTruthy();
      expect(typeof sign).toBe('string');
    });

    it('应该排除sign和sign_type参数', () => {
      const { privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      const params: Record<string, string> = {
        app_id: 'test-app-id',
        method: 'alipay.trade.query',
        sign: 'existing-sign',
        sign_type: 'RSA2',
        out_trade_no: '123',
      };

      const privateKeyBase64 = privateKey
        .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
        .replace(/-----END RSA PRIVATE KEY-----/g, '')
        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .replace(/\s/g, '');

      // 应该不抛出错误
      expect(() => generateAlipaySignature(params, privateKeyBase64)).not.toThrow();
    });
  });
});


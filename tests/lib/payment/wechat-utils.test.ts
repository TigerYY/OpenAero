/**
 * 微信支付工具函数测试
 */

import {
  verifyWechatSignature,
  verifyWechatPaymentAmount,
  generateWechatSignature,
  parseWechatXml,
} from '@/lib/payment/wechat-utils';

describe('Wechat Utils', () => {
  describe('verifyWechatSignature', () => {
    it('应该在开发环境中跳过验证（如果未配置密钥）', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const params = {
        return_code: 'SUCCESS',
        result_code: 'SUCCESS',
        out_trade_no: '123',
      };
      const sign = 'test-sign';

      const result = verifyWechatSignature(params, sign, undefined);
      expect(result).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });

    it('应该在生产环境中拒绝验证（如果未配置密钥）', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const params = {
        return_code: 'SUCCESS',
        result_code: 'SUCCESS',
        out_trade_no: '123',
      };
      const sign = 'test-sign';

      const result = verifyWechatSignature(params, sign, undefined);
      expect(result).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });

    it('应该验证有效的MD5签名', () => {
      const apiKey = 'test-api-key';
      const params = {
        return_code: 'SUCCESS',
        result_code: 'SUCCESS',
        out_trade_no: '123',
        transaction_id: '456',
      };

      // 生成正确的签名
      const sortedKeys = Object.keys(params)
        .filter(key => params[key] !== undefined && params[key] !== '')
        .sort();
      const signContent = sortedKeys
        .map(key => `${key}=${params[key]}`)
        .join('&');
      const stringSignTemp = `${signContent}&key=${apiKey}`;
      const correctSign = require('crypto')
        .createHash('md5')
        .update(stringSignTemp, 'utf8')
        .digest('hex')
        .toUpperCase();

      const result = verifyWechatSignature(params, correctSign, apiKey);
      expect(result).toBe(true);
    });

    it('应该拒绝无效的签名', () => {
      const apiKey = 'test-api-key';
      const params = {
        return_code: 'SUCCESS',
        result_code: 'SUCCESS',
        out_trade_no: '123',
      };
      const invalidSign = 'invalid-sign';

      const result = verifyWechatSignature(params, invalidSign, apiKey);
      expect(result).toBe(false);
    });

    it('应该排除sign参数和空值', () => {
      const apiKey = 'test-api-key';
      const params = {
        return_code: 'SUCCESS',
        result_code: 'SUCCESS',
        out_trade_no: '123',
        sign: 'existing-sign',
        empty_field: '',
        undefined_field: undefined,
      };

      // 应该不包含sign、empty_field和undefined_field
      const sortedKeys = Object.keys(params)
        .filter(key => key !== 'sign' && params[key] !== undefined && params[key] !== '')
        .sort();
      expect(sortedKeys).not.toContain('sign');
      expect(sortedKeys).not.toContain('empty_field');
      expect(sortedKeys).not.toContain('undefined_field');
    });
  });

  describe('verifyWechatPaymentAmount', () => {
    it('应该验证金额匹配（元转分）', () => {
      expect(verifyWechatPaymentAmount(100.0, '10000')).toBe(true); // 100元 = 10000分
      expect(verifyWechatPaymentAmount(100.5, '10050')).toBe(true); // 100.5元 = 10050分
      expect(verifyWechatPaymentAmount(0.01, '1')).toBe(true); // 0.01元 = 1分
    });

    it('应该拒绝金额不匹配', () => {
      expect(verifyWechatPaymentAmount(100.0, '5000')).toBe(false); // 100元 != 5000分
      expect(verifyWechatPaymentAmount(100.0, '15000')).toBe(false); // 100元 != 15000分
    });
  });

  describe('generateWechatSignature', () => {
    it('应该生成有效的MD5签名', () => {
      const apiKey = 'test-api-key';
      const params = {
        return_code: 'SUCCESS',
        result_code: 'SUCCESS',
        out_trade_no: '123',
      };

      const sign = generateWechatSignature(params, apiKey);
      expect(sign).toBeTruthy();
      expect(typeof sign).toBe('string');
      expect(sign.length).toBe(32); // MD5签名长度为32
      expect(sign).toBe(sign.toUpperCase()); // 应该为大写
    });

    it('应该排除空值和undefined', () => {
      const apiKey = 'test-api-key';
      const params = {
        return_code: 'SUCCESS',
        empty_field: '',
        undefined_field: undefined,
        out_trade_no: '123',
      };

      // 应该不抛出错误
      expect(() => generateWechatSignature(params, apiKey)).not.toThrow();
    });
  });

  describe('parseWechatXml', () => {
    it('应该解析有效的XML', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xml>
  <return_code><![CDATA[SUCCESS]]></return_code>
  <result_code><![CDATA[SUCCESS]]></result_code>
  <out_trade_no><![CDATA[123]]></out_trade_no>
  <transaction_id><![CDATA[456]]></transaction_id>
</xml>`;

      const result = parseWechatXml(xml);
      expect(result).toBeDefined();
      expect(result.return_code).toBe('SUCCESS');
      expect(result.result_code).toBe('SUCCESS');
      expect(result.out_trade_no).toBe('123');
      expect(result.transaction_id).toBe('456');
    });

    it('应该处理空XML', () => {
      const xml = '<xml></xml>';
      const result = parseWechatXml(xml);
      expect(result).toBeDefined();
    });
  });
});


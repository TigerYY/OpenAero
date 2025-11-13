/**
 * 微信支付工具函数
 * 用于签名验证和支付处理
 */

import crypto from 'crypto';

/**
 * 验证微信支付回调签名
 * @param params 回调参数对象
 * @param sign 签名
 * @param key 微信支付密钥（API密钥）
 * @returns 验证是否通过
 */
export function verifyWechatSignature(
  params: Record<string, string>,
  sign: string,
  key?: string
): boolean {
  try {
    // 如果没有配置密钥，在开发环境中跳过验证
    if (!key) {
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (isDevelopment) {
        console.warn('微信支付密钥未配置，在开发环境中跳过签名验证');
        return true;
      }
      console.error('微信支付密钥未配置，无法验证签名');
      return false;
    }

    // 移除sign参数
    const paramsToVerify: Record<string, string> = {};
    Object.entries(params).forEach(([key, value]) => {
      if (key !== 'sign' && value) {
        paramsToVerify[key] = value;
      }
    });

    // 按参数名ASCII码从小到大排序
    const sortedParams = Object.entries(paramsToVerify)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    // 拼接API密钥
    const stringSignTemp = `${sortedParams}&key=${key}`;

    // 使用MD5加密并转大写
    const calculatedSign = crypto
      .createHash('md5')
      .update(stringSignTemp, 'utf8')
      .digest('hex')
      .toUpperCase();

    return calculatedSign === sign.toUpperCase();
  } catch (error) {
    console.error('微信支付签名验证失败:', error);
    return false;
  }
}

/**
 * 生成微信支付签名
 * @param params 参数对象
 * @param key 微信支付密钥（API密钥）
 * @returns 签名
 */
export function generateWechatSignature(
  params: Record<string, string>,
  key: string
): string {
  // 移除空值和sign参数
  const filteredParams: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (key !== 'sign' && value) {
      filteredParams[key] = value;
    }
  });

  // 按参数名ASCII码从小到大排序
  const sortedParams = Object.entries(filteredParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  // 拼接API密钥
  const stringSignTemp = `${sortedParams}&key=${key}`;

  // 使用MD5加密并转大写
  return crypto
    .createHash('md5')
    .update(stringSignTemp, 'utf8')
    .digest('hex')
    .toUpperCase();
}

/**
 * 验证支付金额是否匹配（微信支付金额以分为单位）
 * @param expectedAmount 期望金额（元）
 * @param actualAmount 实际金额（分）
 * @returns 是否匹配
 */
export function verifyWechatPaymentAmount(expectedAmount: number, actualAmount: string | number): boolean {
  const actual = typeof actualAmount === 'string' ? parseInt(actualAmount, 10) : actualAmount;
  const expectedInCents = Math.round(expectedAmount * 100);
  // 允许1分的误差
  return Math.abs(expectedInCents - actual) <= 1;
}

/**
 * 解析微信支付XML回调数据
 * @param xml XML字符串
 * @returns 解析后的参数对象
 */
export function parseWechatXml(xml: string): Record<string, string> {
  const params: Record<string, string> = {};
  
  // 匹配CDATA格式的标签
  const cdataRegex = /<(\w+)><!\[CDATA\[(.*?)\]\]><\/\1>/gi;
  let match;
  while ((match = cdataRegex.exec(xml)) !== null) {
    params[match[1]] = match[2];
  }
  
  // 匹配普通格式的标签（如果没有CDATA）
  if (Object.keys(params).length === 0) {
    const normalRegex = /<(\w+)>(.*?)<\/\1>/gi;
    while ((match = normalRegex.exec(xml)) !== null) {
      params[match[1]] = match[2];
    }
  }
  
  return params;
}


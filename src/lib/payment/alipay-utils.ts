/**
 * 支付宝支付工具函数
 * 用于签名验证和支付处理
 */

import crypto from 'crypto';

/**
 * 验证支付宝回调签名
 * @param params 回调参数（URLSearchParams格式）
 * @param sign 签名
 * @param publicKey 支付宝公钥
 * @returns 验证是否通过
 */
export function verifyAlipaySignature(
  params: URLSearchParams,
  sign: string,
  publicKey?: string
): boolean {
  try {
    // 如果没有配置公钥，在开发环境中跳过验证
    if (!publicKey) {
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (isDevelopment) {
        console.warn('支付宝公钥未配置，在开发环境中跳过签名验证');
        return true;
      }
      console.error('支付宝公钥未配置，无法验证签名');
      return false;
    }

    // 移除sign和sign_type参数
    const paramsToVerify = new URLSearchParams();
    params.forEach((value, key) => {
      if (key !== 'sign' && key !== 'sign_type' && value) {
        paramsToVerify.append(key, value);
      }
    });

    // 按参数名ASCII码从小到大排序
    const sortedParams = Array.from(paramsToVerify.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    // 使用RSA2公钥验证签名
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(sortedParams, 'utf8');
    
    // 支付宝公钥格式处理（去除头尾标记和换行符）
    const formattedPublicKey = publicKey
      .replace(/-----BEGIN PUBLIC KEY-----/g, '')
      .replace(/-----END PUBLIC KEY-----/g, '')
      .replace(/\s/g, '');
    
    const publicKeyBuffer = Buffer.from(formattedPublicKey, 'base64');
    const publicKeyPEM = `-----BEGIN PUBLIC KEY-----\n${formattedPublicKey.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;

    return verify.verify(publicKeyPEM, sign, 'base64');
  } catch (error) {
    console.error('支付宝签名验证失败:', error);
    return false;
  }
}

/**
 * 生成支付宝签名
 * @param params 参数对象
 * @param privateKey 应用私钥
 * @returns 签名
 */
export function generateAlipaySignature(
  params: Record<string, string>,
  privateKey: string
): string {
  // 移除空值和sign、sign_type参数
  const filteredParams: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (key !== 'sign' && key !== 'sign_type' && value) {
      filteredParams[key] = value;
    }
  });

  // 按参数名ASCII码从小到大排序
  const sortedParams = Object.entries(filteredParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  // 使用RSA2私钥签名
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(sortedParams, 'utf8');
  
  // 格式化私钥
  const formattedPrivateKey = privateKey
    .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
    .replace(/-----END RSA PRIVATE KEY-----/g, '')
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  
  const privateKeyPEM = `-----BEGIN RSA PRIVATE KEY-----\n${formattedPrivateKey.match(/.{1,64}/g)?.join('\n')}\n-----END RSA PRIVATE KEY-----`;

  return sign.sign(privateKeyPEM, 'base64');
}

/**
 * 验证支付金额是否匹配
 * @param expectedAmount 期望金额
 * @param actualAmount 实际金额
 * @returns 是否匹配
 */
export function verifyPaymentAmount(expectedAmount: number, actualAmount: string | number): boolean {
  const actual = typeof actualAmount === 'string' ? parseFloat(actualAmount) : actualAmount;
  // 允许0.01的误差（浮点数精度问题）
  return Math.abs(expectedAmount - actual) < 0.01;
}


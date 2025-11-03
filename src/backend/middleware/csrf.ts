import { NextRequest, NextResponse } from 'next/server';

/**
 * CSRF保护中间件
 */
export function csrfProtection() {
  return (request: NextRequest): NextResponse | null => {
    // 只对非GET请求进行CSRF检查
    if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
      return null;
    }

    // 检查Origin和Referer头
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');
    
    // 允许来自相同域名的请求
    if (origin && host && new URL(origin).hostname === host) {
      return null;
    }
    
    if (referer && host && new URL(referer).hostname === host) {
      return null;
    }

    // 检查CSRF令牌（如果使用）
    const csrfToken = request.headers.get('x-csrf-token') || 
                     (await request.json()).csrfToken; // 如果请求体中有CSRF令牌

    if (csrfToken) {
      // 验证CSRF令牌（这里需要实现具体的令牌验证逻辑）
      const isValid = validateCsrfToken(csrfToken, request);
      if (isValid) {
        return null;
      }
    }

    // 如果所有检查都失败，返回CSRF错误
    return NextResponse.json(
      { error: 'CSRF验证失败' },
      { status: 403 }
    );
  };
}

/**
 * 验证CSRF令牌（简化实现）
 */
function validateCsrfToken(token: string, request: NextRequest): boolean {
  // 这里应该实现具体的CSRF令牌验证逻辑
  // 例如：检查令牌是否与会话中的令牌匹配
  // 或者使用加密签名验证
  
  // 简化实现：检查令牌格式
  if (token && token.length >= 32) {
    return true;
  }
  
  return false;
}

/**
 * 生成CSRF令牌
 */
export function generateCsrfToken(): string {
  // 生成随机的CSRF令牌
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 双重提交Cookie模式CSRF保护
 */
export function doubleSubmitCookieCsrf() {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
      return null;
    }

    // 检查Cookie中的CSRF令牌
    const cookieToken = request.cookies.get('csrf-token')?.value;
    const headerToken = request.headers.get('x-csrf-token');
    
    if (!cookieToken || !headerToken) {
      return NextResponse.json(
        { error: 'CSRF令牌缺失' },
        { status: 403 }
      );
    }

    // 验证令牌是否匹配
    if (cookieToken !== headerToken) {
      return NextResponse.json(
        { error: 'CSRF令牌不匹配' },
        { status: 403 }
      );
    }

    return null;
  };
}

/**
 * 宽松的CSRF保护（仅检查关键操作）
 */
export function lenientCsrfProtection() {
  return (request: NextRequest): NextResponse | null => {
    // 只对敏感操作进行CSRF检查
    const sensitivePaths = [
      '/api/auth/password-change',
      '/api/payments',
      '/api/admin',
      '/api/users/[^/]+/delete'
    ];

    const pathname = request.nextUrl.pathname;
    const isSensitive = sensitivePaths.some(pattern => 
      new RegExp(pattern).test(pathname)
    );

    if (!isSensitive) {
      return null;
    }

    return csrfProtection()(request);
  };
}
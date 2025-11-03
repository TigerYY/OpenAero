import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // 时间窗口（毫秒）
  maxRequests: number; // 最大请求数
  message?: string; // 限制消息
}

interface RateLimitData {
  count: number;
  resetTime: number;
}

// 内存存储（生产环境应使用Redis）
const rateLimitStore = new Map<string, RateLimitData>();

/**
 * 速率限制中间件
 */
export function rateLimit(config: RateLimitConfig) {
  return (request: NextRequest): NextResponse | null => {
    const key = getRateLimitKey(request);
    const now = Date.now();
    
    let data = rateLimitStore.get(key);
    
    // 初始化或重置数据
    if (!data || now > data.resetTime) {
      data = {
        count: 0,
        resetTime: now + config.windowMs
      };
      rateLimitStore.set(key, data);
    }
    
    // 检查是否超过限制
    if (data.count >= config.maxRequests) {
      return NextResponse.json(
        { 
          error: config.message || '请求过于频繁，请稍后重试',
          retryAfter: Math.ceil((data.resetTime - now) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((data.resetTime - now) / 1000).toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': data.resetTime.toString()
          }
        }
      );
    }
    
    // 增加计数
    data.count++;
    
    // 设置响应头
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', (config.maxRequests - data.count).toString());
    response.headers.set('X-RateLimit-Reset', data.resetTime.toString());
    
    return null;
  };
}

/**
 * 获取速率限制键
 */
function getRateLimitKey(request: NextRequest): string {
  const ip = getClientIP(request);
  const path = request.nextUrl.pathname;
  const method = request.method;
  
  return `${ip}:${method}:${path}`;
}

/**
 * 获取客户端IP地址
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

/**
 * 预定义的速率限制配置
 */
export const rateLimitConfigs = {
  // 认证相关API限制
  auth: {
    windowMs: 15 * 60 * 1000, // 15分钟
    maxRequests: 10,
    message: '认证请求过于频繁，请15分钟后再试'
  },
  
  // 通用API限制
  api: {
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 100,
    message: 'API请求过于频繁，请稍后重试'
  },
  
  // 文件上传限制
  upload: {
    windowMs: 60 * 60 * 1000, // 1小时
    maxRequests: 20,
    message: '文件上传次数过多，请1小时后再试'
  },
  
  // 支付相关限制
  payment: {
    windowMs: 5 * 60 * 1000, // 5分钟
    maxRequests: 10,
    message: '支付请求过于频繁，请5分钟后再试'
  }
} as const;
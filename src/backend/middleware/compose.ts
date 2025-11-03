import { NextRequest, NextResponse } from 'next/server';

/**
 * 中间件函数类型
 */
export type Middleware = (request: NextRequest) => Promise<NextResponse | null>;

/**
 * 组合多个中间件
 */
export function composeMiddleware(...middlewares: Middleware[]): Middleware {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    for (const middleware of middlewares) {
      const result = await middleware(request);
      if (result) {
        return result; // 如果中间件返回响应，则停止执行
      }
    }
    return null; // 所有中间件都通过
  };
}

/**
 * 创建API处理器包装器
 */
export function createApiHandler(
  handler: (request: NextRequest) => Promise<Response>,
  ...middlewares: Middleware[]
) {
  const composedMiddleware = composeMiddleware(...middlewares);
  
  return async (request: NextRequest): Promise<Response> => {
    // 执行中间件
    const middlewareResult = await composedMiddleware(request);
    if (middlewareResult) {
      return middlewareResult;
    }
    
    // 执行处理器
    return handler(request);
  };
}

/**
 * 预定义的中间件组合
 */
export const middlewareCompositions = {
  // 公开API（仅限速率限制）
  publicApi: (config?: { rateLimit?: 'auth' | 'api' | 'upload' | 'payment' }) => {
    const { rateLimit = 'api' } = config || {};
    const { rateLimit: rateLimitMiddleware, rateLimitConfigs } = require('./rateLimit');
    
    return [
      rateLimitMiddleware(rateLimitConfigs[rateLimit])
    ];
  },
  
  // 认证API（需要登录）
  authenticatedApi: (config?: { 
    rateLimit?: 'auth' | 'api' | 'upload' | 'payment';
    roles?: string[];
  }) => {
    const { rateLimit = 'api', roles } = config || {};
    const { rateLimit: rateLimitMiddleware, rateLimitConfigs } = require('./rateLimit');
    const { authenticateToken, requireRole } = require('../auth/auth.middleware');
    
    const middlewares: Middleware[] = [
      rateLimitMiddleware(rateLimitConfigs[rateLimit]),
      authenticateToken
    ];
    
    if (roles && roles.length > 0) {
      middlewares.push(requireRole(roles));
    }
    
    return middlewares;
  },
  
  // 管理员API
  adminApi: (config?: { rateLimit?: 'auth' | 'api' | 'upload' | 'payment' }) => {
    const { rateLimit = 'api' } = config || {};
    const { rateLimit: rateLimitMiddleware, rateLimitConfigs } = require('./rateLimit');
    const { authenticateToken, requireAdmin } = require('../auth/auth.middleware');
    
    return [
      rateLimitMiddleware(rateLimitConfigs[rateLimit]),
      authenticateToken,
      requireAdmin
    ];
  },
  
  // 文件上传API
  uploadApi: () => {
    const { rateLimit: rateLimitMiddleware, rateLimitConfigs } = require('./rateLimit');
    const { authenticateToken } = require('../auth/auth.middleware');
    
    return [
      rateLimitMiddleware(rateLimitConfigs.upload),
      authenticateToken
    ];
  },
  
  // 支付API
  paymentApi: () => {
    const { rateLimit: rateLimitMiddleware, rateLimitConfigs } = require('./rateLimit');
    const { authenticateToken } = require('../auth/auth.middleware');
    
    return [
      rateLimitMiddleware(rateLimitConfigs.payment),
      authenticateToken
    ];
  }
};

/**
 * 中间件执行器（用于Next.js API路由）
 */
export async function executeMiddlewares(
  request: NextRequest,
  ...middlewares: Middleware[]
): Promise<NextResponse | null> {
  for (const middleware of middlewares) {
    const result = await middleware(request);
    if (result) {
      return result;
    }
  }
  return null;
}

/**
 * 中间件装饰器（实验性）
 */
export function withMiddleware(...middlewares: Middleware[]) {
  return function<T extends (...args: any[]) => any>(
    target: T,
    context: ClassMethodDecoratorContext
  ) {
    return async function (this: any, ...args: any[]) {
      const request = args[0] as NextRequest;
      
      // 执行中间件
      for (const middleware of middlewares) {
        const result = await middleware(request);
        if (result) {
          return result;
        }
      }
      
      // 执行原始方法
      return target.apply(this, args);
    };
  };
}
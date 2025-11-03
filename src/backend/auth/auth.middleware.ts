import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

import { UserRole } from '@/shared/types/auth';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

/**
 * JWT令牌验证中间件
 */
export async function authenticateToken(request: NextRequest): Promise<NextResponse | null> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return NextResponse.json(
      { error: '访问令牌缺失' },
      { status: 401 }
    );
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, jwtSecret) as any;

    // 验证会话是否存在且未过期
    const session = await prisma.userSession.findFirst({
      where: {
        token,
        userId: decoded.userId,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!session) {
      return NextResponse.json(
        { error: '会话已过期或无效' },
        { status: 401 }
      );
    }

    // 更新会话最后使用时间
    await prisma.userSession.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() }
    });

    // 将用户信息添加到请求中
    (request as AuthenticatedRequest).user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    return null; // 继续处理请求
  } catch (error) {
    return NextResponse.json(
      { error: '无效的访问令牌' },
      { status: 401 }
    );
  }
}

/**
 * 角色权限验证中间件
 */
export function requireRole(allowedRoles: UserRole[]) {
  return async (request: AuthenticatedRequest): Promise<NextResponse | null> => {
    const user = request.user;

    if (!user) {
      return NextResponse.json(
        { error: '用户未认证' },
        { status: 401 }
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      );
    }

    return null; // 继续处理请求
  };
}

/**
 * 管理员权限验证
 */
export const requireAdmin = requireRole([UserRole.ADMIN]);

/**
 * 创作者权限验证
 */
export const requireCreator = requireRole([UserRole.CREATOR, UserRole.ADMIN]);

/**
 * 用户权限验证（任何已登录用户）
 */
export const requireUser = requireRole([UserRole.CUSTOMER, UserRole.CREATOR, UserRole.ADMIN]);

/**
 * 可选认证中间件（不强制要求登录）
 */
export async function optionalAuth(request: NextRequest): Promise<NextResponse | null> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return null; // 没有令牌，继续处理请求
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, jwtSecret) as any;

    // 验证会话
    const session = await prisma.userSession.findFirst({
      where: {
        token,
        userId: decoded.userId,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (session) {
      // 更新会话最后使用时间
      await prisma.userSession.update({
        where: { id: session.id },
        data: { lastUsedAt: new Date() }
      });

      // 将用户信息添加到请求中
      (request as AuthenticatedRequest).user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
    }
  } catch (error) {
    // 令牌无效，但不阻止请求继续
    console.warn('Invalid token in optional auth:', error);
  }

  return null; // 继续处理请求
}

/**
 * 组合中间件
 */
export function combineMiddleware(...middlewares: Array<(req: NextRequest) => Promise<NextResponse | null>>) {
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
 * 审计日志记录
 */
export async function logUserAction(
  userId: string,
  action: string,
  resource: string,
  resourceId?: string,
  oldValues?: any,
  newValues?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        oldValues: oldValues || undefined,
        newValues: newValues || undefined,
        ipAddress,
        userAgent
      }
    });
  } catch (error) {
    console.error('Failed to log user action:', error);
  }
}

/**
 * 获取客户端IP地址
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  // 移除可能未定义的 request.ip 访问
  return 'unknown';
}
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/supabase-server-auth';

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
 * Supabase令牌验证中间件
 * 使用新的 Supabase 认证系统
 */
export async function authenticateToken(request: NextRequest): Promise<NextResponse | null> {
  const session = await getServerSession(request);

  if (!session) {
    return NextResponse.json(
      { error: '访问令牌缺失或无效' },
      { status: 401 }
    );
  }

  try {
    // 从数据库获取用户角色信息
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true }
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 401 }
      );
    }

    // 将用户信息添加到请求中
    (request as AuthenticatedRequest).user = {
      userId: dbUser.id,
      email: session.user.email,
      role: dbUser.role as UserRole
    };

    return null; // 继续处理请求
  } catch (error) {
    return NextResponse.json(
      { error: '认证验证失败' },
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
 * 可选认证中间件（不强制要求登录）
 */
export async function optionalAuth(request: NextRequest): Promise<NextResponse | null> {
  const session = await getServerSession(request);

  if (!session) {
    return null; // 没有会话，继续处理请求
  }

  try {
    // 从数据库获取用户角色信息
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true }
    });

    if (dbUser) {
      // 将用户信息添加到请求中
      (request as AuthenticatedRequest).user = {
        userId: dbUser.id,
        email: session.user.email,
        role: dbUser.role as UserRole
      };
    }
  } catch (error) {
    // 认证失败，但不阻止请求继续
    console.warn('Optional auth failed:', error);
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
  
  return 'unknown';
}
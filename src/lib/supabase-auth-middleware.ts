import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-auth';
import { UserRole } from '@/shared/types/auth';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

/**
 * Supabase会话验证中间件
 */
export async function authenticateSupabaseSession(request: NextRequest): Promise<NextResponse | null> {
  try {
    const supabase = createClient();
    
    // 从请求中获取访问令牌
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!accessToken) {
      // 尝试从cookie中获取令牌
      const cookieToken = request.cookies.get('sb-access-token')?.value;
      if (!cookieToken) {
        return NextResponse.json(
          { error: '访问令牌缺失' },
          { status: 401 }
        );
      }
    }

    // 验证用户会话
    const { data: { user }, error } = await supabase.auth.getUser(accessToken || request.cookies.get('sb-access-token')?.value);

    if (error || !user) {
      return NextResponse.json(
        { error: '会话已过期或无效' },
        { status: 401 }
      );
    }

    // 获取用户角色（从用户元数据中）
    const userRole = user.user_metadata?.role || UserRole.CUSTOMER;

    // 将用户信息添加到请求中
    (request as AuthenticatedRequest).user = {
      userId: user.id,
      email: user.email || '',
      role: userRole
    };

    return null; // 继续处理请求
  } catch (error) {
    console.error('Supabase认证错误:', error);
    return NextResponse.json(
      { error: '认证验证失败' },
      { status: 500 }
    );
  }
}

/**
 * 刷新Supabase会话
 */
export async function refreshSupabaseSession(request: NextRequest): Promise<NextResponse | null> {
  try {
    const refreshToken = request.cookies.get('sb-refresh-token')?.value;
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: '刷新令牌缺失' },
        { status: 401 }
      );
    }

    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !session) {
      return NextResponse.json(
        { error: '会话刷新失败' },
        { status: 401 }
      );
    }

    return null; // 继续处理请求
  } catch (error) {
    console.error('会话刷新错误:', error);
    return NextResponse.json(
      { error: '会话刷新失败' },
      { status: 500 }
    );
  }
}

/**
 * 角色权限验证中间件（Supabase版本）
 */
export function requireSupabaseRole(allowedRoles: UserRole[]) {
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
 * 管理员权限验证（Supabase版本）
 */
export const requireSupabaseAdmin = requireSupabaseRole([UserRole.ADMIN]);

/**
 * 创作者权限验证（Supabase版本）
 */
export const requireSupabaseCreator = requireSupabaseRole([UserRole.CREATOR, UserRole.ADMIN]);

/**
 * 用户权限验证（Supabase版本）
 */
export const requireSupabaseUser = requireSupabaseRole([UserRole.CUSTOMER, UserRole.CREATOR, UserRole.ADMIN]);

/**
 * 可选认证中间件（Supabase版本）
 */
export async function optionalSupabaseAuth(request: NextRequest): Promise<NextResponse | null> {
  try {
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader && authHeader.split(' ')[1];

    if (!accessToken && !request.cookies.get('sb-access-token')?.value) {
      return null; // 没有令牌，继续处理请求
    }

    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser(
      accessToken || request.cookies.get('sb-access-token')?.value
    );

    if (!error && user) {
      const userRole = user.user_metadata?.role || UserRole.CUSTOMER;
      
      // 将用户信息添加到请求中
      (request as AuthenticatedRequest).user = {
        userId: user.id,
        email: user.email || '',
        role: userRole
      };
    }
  } catch (error) {
    // 令牌无效，但不阻止请求继续
    console.warn('Invalid Supabase token in optional auth:', error);
  }

  return null; // 继续处理请求
}

/**
 * 组合Supabase中间件
 */
export function combineSupabaseMiddleware(...middlewares: Array<(req: NextRequest) => Promise<NextResponse | null>>) {
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

/**
 * 自动令牌刷新处理中间件
 */
export async function handleTokenRefresh(request: NextRequest): Promise<NextResponse | null> {
  try {
    const refreshToken = request.cookies.get('sb-refresh-token')?.value;
    
    if (!refreshToken) {
      return null; // 没有刷新令牌，继续处理
    }

    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !session) {
      // 刷新失败，清除cookies
      const response = NextResponse.json(
        { error: '会话已过期，请重新登录' },
        { status: 401 }
      );
      
      response.cookies.delete('sb-access-token');
      response.cookies.delete('sb-refresh-token');
      
      return response;
    }

    // 如果有新的会话，更新cookies（这将在响应处理中完成）
    return null;
  } catch (error) {
    console.error('自动令牌刷新错误:', error);
    return null; // 不阻止请求继续
  }
}

/**
 * 用户操作日志记录
 */
export async function logUserAction(
  userId: string,
  action: string,
  details?: Record<string, any>,
  request?: NextRequest
): Promise<void> {
  try {
    const ip = request ? getClientIP(request) : 'unknown';
    const userAgent = request?.headers.get('user-agent') || 'unknown';
    
    // 这里可以将日志保存到数据库或日志服务
    console.log('用户操作日志:', {
      userId,
      action,
      details,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    });
    
    // 如果需要持久化到数据库，可以在这里添加Prisma或其他数据库操作
    // await prisma.userActionLog.create({
    //   data: {
    //     userId,
    //     action,
    //     details: details ? JSON.stringify(details) : null,
    //     ip,
    //     userAgent,
    //   },
    // });
  } catch (error) {
    console.error('记录用户操作失败:', error);
    // 不抛出错误，避免影响主要业务流程
  }
}

/**
 * Supabase认证失败的错误处理
 */
export function handleSupabaseAuthError(error: any): NextResponse {
  console.error('Supabase认证错误:', error);

  // 处理特定的Supabase错误
  if (error?.message?.includes('Invalid token')) {
    return NextResponse.json(
      { error: '无效的访问令牌' },
      { status: 401 }
    );
  }

  if (error?.message?.includes('Token expired')) {
    return NextResponse.json(
      { error: '访问令牌已过期' },
      { status: 401 }
    );
  }

  if (error?.message?.includes('User not found')) {
    return NextResponse.json(
      { error: '用户不存在' },
      { status: 404 }
    );
  }

  // 通用错误处理
  return NextResponse.json(
    { error: '认证验证失败' },
    { status: 500 }
  );
}
/**
 * API路由辅助函数
 * 提供常用的请求信息提取、审计日志、统一响应和错误处理功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from './auth/auth-service';
import { authenticateRequest } from './auth-helpers';
import { ApiResponse } from '@/types';
import { z } from 'zod';

/**
 * 从请求中提取IP地址
 */
export function getRequestIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '0.0.0.0'
  );
}

/**
 * 从请求中提取User Agent
 */
export function getRequestUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'Unknown';
}

/**
 * 记录审计日志的便捷函数
 */
export async function logAuditAction(
  request: NextRequest,
  options: {
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    oldValue?: unknown;
    newValue?: unknown;
    metadata?: Record<string, unknown>;
    success?: boolean;
    errorMessage?: string;
  }
): Promise<void> {
  await AuthService.logAudit({
    user_id: options.userId,
    action: options.action,
    resource: options.resource,
    resource_id: options.resourceId,
    old_value: options.oldValue,
    new_value: options.newValue,
    metadata: options.metadata,
    ip_address: getRequestIp(request),
    user_agent: getRequestUserAgent(request),
    success: options.success ?? true,
    error_message: options.errorMessage,
  });
}

/**
 * 验证管理员权限
 * 返回用户信息或错误响应
 */
export async function requireAdminAuth(
  request: NextRequest
): Promise<
  | { success: true; user: { id: string; role: string; roles?: string[] } }
  | { success: false; response: NextResponse; error?: NextResponse }
> {
  // 验证用户身份
  const authResult = await authenticateRequest(request);
  if (!authResult.success || !authResult.user) {
    const errorResponse = authResult.error || NextResponse.json(
      { success: false, error: '未授权访问' },
      { status: 401 }
    );
    console.log('[requireAdminAuth] 认证失败，返回错误响应');
    return {
      success: false,
      response: errorResponse,
      error: errorResponse,
    };
  }

  // 获取用户角色（支持多角色）
  const userProfile = (authResult.user as any).profile;
  const userRoles = Array.isArray(userProfile?.roles)
    ? userProfile.roles
    : (userProfile?.role ? [userProfile.role] : [authResult.user.role || '']);

  // 检查管理员权限（包括 ADMIN 和 SUPER_ADMIN）
  if (!userRoles.includes('ADMIN') && !userRoles.includes('SUPER_ADMIN')) {
    console.log('[requireAdminAuth] 权限不足，当前角色:', userRoles);
    const errorResponse = NextResponse.json(
      { success: false, error: '权限不足，需要管理员权限' },
      { status: 403 }
    );
    return {
      success: false,
      response: errorResponse,
      error: errorResponse,
    };
  }

  console.log('[requireAdminAuth] 权限验证成功:', {
    userId: authResult.user.id,
    roles: userRoles,
  });

  return {
    success: true,
    user: {
      id: authResult.user.id,
      role: userRoles[0] || authResult.user.role || '',
      roles: userRoles,
    },
  };
}

/**
 * 验证审核员权限（REVIEWER 或 ADMIN）
 * 返回用户信息或错误响应
 */
export async function requireReviewerAuth(
  request: NextRequest
): Promise<
  | { success: true; user: { id: string; role: string; roles?: string[] } }
  | { success: false; response: NextResponse; error?: NextResponse }
> {
  // 验证用户身份
  const authResult = await authenticateRequest(request);
  if (!authResult.success || !authResult.user) {
    const errorResponse = authResult.error || NextResponse.json(
      { success: false, error: '未授权访问' },
      { status: 401 }
    );
    return {
      success: false,
      response: errorResponse,
      error: errorResponse,
    };
  }

  // 获取用户角色（支持多角色）
  const userProfile = (authResult.user as any).profile;
  const userRoles = Array.isArray(userProfile?.roles)
    ? userProfile.roles
    : (userProfile?.role ? [userProfile.role] : [authResult.user.role || '']);

  // 检查审核员权限（包括 REVIEWER、ADMIN 和 SUPER_ADMIN）
  if (!userRoles.includes('REVIEWER') && 
      !userRoles.includes('ADMIN') && 
      !userRoles.includes('SUPER_ADMIN')) {
    const errorResponse = NextResponse.json(
      { success: false, error: '权限不足，需要审核员权限' },
      { status: 403 }
    );
    return {
      success: false,
      response: errorResponse,
      error: errorResponse,
    };
  }

  return {
    success: true,
    user: {
      id: authResult.user.id,
      role: userRoles[0] || authResult.user.role || '',
      roles: userRoles,
    },
  };
}

/**
 * 验证创作者权限
 * 返回用户信息或错误响应
 */
export async function requireCreatorAuth(
  request: NextRequest
): Promise<
  | { success: true; user: { id: string; role: string; roles?: string[] } }
  | { success: false; response: NextResponse; error?: NextResponse }
> {
  // 验证用户身份
  const authResult = await authenticateRequest(request);
  if (!authResult.success || !authResult.user) {
    const errorResponse = authResult.error || NextResponse.json(
      { success: false, error: '未授权访问' },
      { status: 401 }
    );
    return {
      success: false,
      response: errorResponse,
      error: errorResponse,
    };
  }

  // 获取用户角色（支持多角色）
  const userProfile = (authResult.user as any).profile;
  const userRoles = Array.isArray(userProfile?.roles)
    ? userProfile.roles
    : (userProfile?.role ? [userProfile.role] : [authResult.user.role || '']);

  // 检查创作者权限（包括 CREATOR、ADMIN 和 SUPER_ADMIN）
  if (!userRoles.includes('CREATOR') && 
      !userRoles.includes('ADMIN') && 
      !userRoles.includes('SUPER_ADMIN')) {
    const errorResponse = NextResponse.json(
      { success: false, error: '权限不足，需要创作者权限' },
      { status: 403 }
    );
    return {
      success: false,
      response: errorResponse,
      error: errorResponse,
    };
  }

  return {
    success: true,
    user: {
      id: authResult.user.id,
      role: userRoles[0] || authResult.user.role || '',
      roles: userRoles,
    },
  };
}

/**
 * 创建成功响应
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message: message || '操作成功',
    },
    { status }
  );
}

/**
 * 创建错误响应
 */
export function createErrorResponse(
  error: string,
  status: number = 400,
  details?: unknown
): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    {
      success: false,
      error,
      details,
    },
    { status }
  );
}

/**
 * 创建验证错误响应
 */
export function createValidationErrorResponse(
  zodError: z.ZodError
): NextResponse<ApiResponse<null>> {
  const errors = zodError.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));

  return NextResponse.json(
    {
      success: false,
      error: '验证失败',
      details: {
        validationErrors: errors,
      },
    },
    { status: 400 }
  );
}

/**
 * 创建分页响应
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): NextResponse<ApiResponse<{
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}>> {
  const totalPages = Math.ceil(total / limit);
  
  return NextResponse.json({
    success: true,
    data: {
      items: data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    },
    message: message || '获取数据成功',
  });
}

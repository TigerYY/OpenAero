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
  | { success: true; user: { id: string; role: string } }
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

  // 检查管理员权限（包括 ADMIN 和 SUPER_ADMIN）
  if (authResult.user.role !== 'ADMIN' && authResult.user.role !== 'SUPER_ADMIN') {
    console.log('[requireAdminAuth] 权限不足，当前角色:', authResult.user.role);
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
    role: authResult.user.role,
  });

  return {
    success: true,
    user: {
      id: authResult.user.id,
      role: authResult.user.role,
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
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  if (message) {
    response.message = message;
  }
  return NextResponse.json(response, { status });
}

/**
 * 创建错误响应
 */
export function createErrorResponse(
  error: string | Error,
  status: number = 500,
  details?: unknown
): NextResponse<ApiResponse<null>> {
  const errorMessage = error instanceof Error ? error.message : error;
  const response: ApiResponse<null> = {
    success: false,
    error: errorMessage,
    data: null,
  };
  if (details) {
    (response as ApiResponse<null> & { details: unknown }).details = details;
  }
  return NextResponse.json(response, { status });
}

/**
 * 创建验证错误响应（用于Zod等验证库）
 */
export function createValidationErrorResponse(
  errors: z.ZodError | Record<string, string[]>
): NextResponse<ApiResponse<null>> {
  const errorDetails = errors instanceof z.ZodError
    ? errors.flatten().fieldErrors
    : errors;
  
  return NextResponse.json(
    {
      success: false,
      error: '验证失败',
      data: null,
      details: errorDetails,
    } as ApiResponse<null> & { details: unknown },
    { status: 400 }
  );
}

/**
 * API路由错误处理包装器
 * 自动捕获错误并返回统一格式的错误响应
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  errorMessage?: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error(errorMessage || 'API处理失败:', error);
      
      // 处理Zod验证错误
      if (error instanceof z.ZodError) {
        return createValidationErrorResponse(error);
      }
      
      // 处理其他错误
      const message = error instanceof Error ? error.message : '服务器错误';
      return createErrorResponse(
        errorMessage || message,
        500,
        error instanceof Error ? { stack: error.stack, name: error.name } : undefined
      );
    }
  }) as T;
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
): NextResponse<ApiResponse<T[]> & { pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const totalPages = Math.ceil(total / limit);
  return NextResponse.json({
    success: true,
    data,
    message,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
}


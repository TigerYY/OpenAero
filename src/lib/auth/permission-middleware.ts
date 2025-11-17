/**
 * 统一权限检查中间件
 * 用于所有 API 路由的权限验证
 */

import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth-helpers';
import { createErrorResponse } from '@/lib/api-helpers';
import { UserRole } from '@prisma/client';

/**
 * 要求用户已登录
 * @throws Error 如果用户未登录
 */
export async function requireAuth(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  
  if (!authResult.success || !authResult.user) {
    throw new Error('Unauthorized');
  }
  
  return authResult.user;
}

/**
 * 要求用户具有特定角色
 * @param request Next.js 请求对象
 * @param allowedRoles 允许的角色列表
 * @throws Error 如果用户未登录或角色不匹配
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: UserRole[]
) {
  const user = await requireAuth(request);
  
  // 检查用户是否拥有允许的角色之一
  const hasRole = user.roles?.some((role) => 
    allowedRoles.includes(role as UserRole)
  );
  
  if (!hasRole) {
    throw new Error('Insufficient permissions');
  }
  
  return user;
}

/**
 * 检查资源所有权
 * @param userId 当前用户 ID
 * @param resourceUserId 资源所有者 ID
 * @throws Error 如果用户不拥有该资源
 */
export function checkResourceOwnership(
  userId: string,
  resourceUserId: string
) {
  if (userId !== resourceUserId) {
    throw new Error('You do not own this resource');
  }
}

/**
 * 检查用户是否是管理员
 * @param user 用户对象
 */
export function isAdmin(user: any): boolean {
  return user.roles?.includes('ADMIN' as UserRole) || 
         user.roles?.includes('SUPER_ADMIN' as UserRole);
}

/**
 * 检查用户是否是创作者
 * @param user 用户对象
 */
export function isCreator(user: any): boolean {
  return user.roles?.includes('CREATOR' as UserRole);
}

/**
 * API 路由权限检查选项
 */
interface AuthOptions {
  /** 允许的角色列表 */
  roles?: UserRole[];
  /** 是否允许未登录用户访问 */
  allowGuest?: boolean;
}

/**
 * 包装 API 路由处理函数，自动处理权限检查
 * 
 * @example
 * ```typescript
 * // 要求用户登录
 * export const GET = withAuth(async (request, user) => {
 *   // user 已经验证通过
 *   return Response.json({ user });
 * });
 * 
 * // 要求特定角色
 * export const POST = withAuth(
 *   async (request, user) => {
 *     // user 已验证且是 CREATOR 或 ADMIN
 *     return Response.json({ success: true });
 *   },
 *   { roles: ['CREATOR', 'ADMIN'] }
 * );
 * 
 * // 允许访客访问
 * export const GET = withAuth(
 *   async (request, user) => {
 *     // user 可能为 null（访客）
 *     if (!user) {
 *       // 返回公开数据
 *     } else {
 *       // 返回用户专属数据
 *     }
 *   },
 *   { allowGuest: true }
 * );
 * ```
 */
export function withAuth<T extends any[] = []>(
  handler: (request: NextRequest, user: any, ...args: T) => Promise<Response>,
  options?: AuthOptions
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    try {
      let user;
      
      // 如果允许访客，尝试获取用户但不强制要求
      if (options?.allowGuest) {
        const authResult = await authenticateRequest(request);
        user = authResult.success ? authResult.user : null;
      }
      // 如果指定了角色要求
      else if (options?.roles) {
        user = await requireRole(request, options.roles);
      }
      // 默认要求登录
      else {
        user = await requireAuth(request);
      }
      
      // 调用实际的处理函数
      return await handler(request, user, ...args);
    } catch (error) {
      // 处理权限相关错误
      if (error instanceof Error) {
        if (error.message === 'Unauthorized') {
          return createErrorResponse('Unauthorized', 401);
        }
        if (error.message === 'Insufficient permissions') {
          return createErrorResponse('Forbidden', 403);
        }
        if (error.message === 'You do not own this resource') {
          return createErrorResponse('Forbidden - You do not own this resource', 403);
        }
      }
      
      // 其他错误继续抛出
      throw error;
    }
  };
}

/**
 * 创建资源权限检查函数
 * 
 * @example
 * ```typescript
 * export const PUT = withAuth(async (request, user, { params }) => {
 *   const solutionId = params.id;
 *   
 *   // 获取资源
 *   const solution = await prisma.solution.findUnique({
 *     where: { id: solutionId },
 *     include: { creator: true }
 *   });
 *   
 *   if (!solution) {
 *     return Response.json({ error: 'Not found' }, { status: 404 });
 *   }
 *   
 *   // 检查权限
 *   const canModify = createResourcePermissionChecker(user);
 *   canModify(solution.creator.user_id);
 *   
 *   // 更新资源
 *   // ...
 * });
 * ```
 */
export function createResourcePermissionChecker(user: any) {
  return (resourceUserId: string) => {
    // 管理员可以访问所有资源
    if (isAdmin(user)) {
      return;
    }
    
    // 普通用户只能访问自己的资源
    checkResourceOwnership(user.id, resourceUserId);
  };
}

/**
 * 批量权限检查
 * 用于需要检查多个资源的场景
 * 
 * @example
 * ```typescript
 * const solutions = await prisma.solution.findMany();
 * const ownedSolutions = filterOwnedResources(user, solutions, 'creator.user_id');
 * ```
 */
export function filterOwnedResources<T>(
  user: any,
  resources: T[],
  userIdPath: string
): T[] {
  // 管理员可以访问所有资源
  if (isAdmin(user)) {
    return resources;
  }
  
  // 过滤出用户拥有的资源
  return resources.filter((resource) => {
    // 支持嵌套路径，如 'creator.user_id'
    const resourceUserId = userIdPath.split('.').reduce((obj, key) => obj?.[key], resource as any);
    return resourceUserId === user.id;
  });
}

/**
 * 权限检查错误类
 */
export class PermissionError extends Error {
  constructor(
    message: string,
    public statusCode: number = 403
  ) {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * 断言用户拥有资源
 * 如果检查失败，抛出 PermissionError
 * 
 * @example
 * ```typescript
 * const solution = await prisma.solution.findUnique({ ... });
 * assertOwnership(user, solution.creator.user_id);
 * ```
 */
export function assertOwnership(user: any, resourceUserId: string) {
  if (!isAdmin(user) && user.id !== resourceUserId) {
    throw new PermissionError('You do not own this resource');
  }
}

/**
 * 断言用户拥有特定角色
 * 如果检查失败，抛出 PermissionError
 */
export function assertRole(user: any, allowedRoles: UserRole[]) {
  const hasRole = user.roles?.some((role: UserRole) => 
    allowedRoles.includes(role)
  );
  
  if (!hasRole) {
    throw new PermissionError('Insufficient permissions');
  }
}

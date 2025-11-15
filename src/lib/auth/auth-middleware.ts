/**
 * 认证中间件
 * 用于保护需要登录的路由和检查权限
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { getRolePermissions } from './permissions';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * 从请求中获取当前用户
 */
export async function getCurrentUser(request: NextRequest) {
  try {
    // 从 cookie 获取 token
    const token = request.cookies.get('supabase-auth-token')?.value;

    if (!token) {
      return null;
    }

    // 验证 token
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    // 从数据库获取用户信息
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      include: {
        creatorProfile: true,
      },
    });

    if (!dbUser) {
      return null;
    }

    return {
      id: dbUser.id,
      supabaseId: dbUser.supabaseId,
      email: dbUser.email,
      displayName: dbUser.displayName,
      role: dbUser.role,
      status: dbUser.status,
      permissions: dbUser.permissions,
      creatorProfile: dbUser.creatorProfile,
    };
  } catch (error) {
    console.error('获取当前用户失败:', error);
    return null;
  }
}

/**
 * 检查用户是否有指定角色（支持多角色）
 */
export function hasRole(user: any, requiredRoles: UserRole | UserRole[]): boolean {
  if (!user) return false;

  // 支持旧的单一角色格式（向后兼容）
  const userRoles = Array.isArray(user.roles) 
    ? user.roles 
    : (user.role ? [user.role] : []);
  
  const required = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  // 检查用户是否拥有任意一个所需角色
  return required.some(role => userRoles.includes(role));
}

/**
 * 检查用户是否有指定权限（支持多角色）
 */
export function hasPermission(user: any, permission: string): boolean {
  if (!user) return false;

  // 支持旧的单一角色格式（向后兼容）
  const userRoles = Array.isArray(user.roles) 
    ? user.roles 
    : (user.role ? [user.role] : []);

  // 超级管理员和管理员拥有所有权限
  if (userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN)) {
    return true;
  }

  // 检查自定义权限
  if (user.permissions?.includes(permission)) {
    return true;
  }

  // 检查角色默认权限
  for (const role of userRoles) {
    const rolePermissions = getRolePermissions(role);
    if (rolePermissions.includes(permission)) {
      return true;
    }
  }

  return false;
}

/**
 * 角色层级检查
 * 检查用户角色是否大于等于要求的角色（支持多角色，取最高角色）
 */
export function hasMinimumRole(user: any, minimumRole: UserRole): boolean {
  if (!user) return false;

  // 支持旧的单一角色格式（向后兼容）
  const userRoles = Array.isArray(user.roles) 
    ? user.roles 
    : (user.role ? [user.role] : []);

  const roleHierarchy: Record<UserRole, number> = {
    [UserRole.USER]: 1,
    [UserRole.CREATOR]: 2,
    [UserRole.REVIEWER]: 3,
    [UserRole.FACTORY_MANAGER]: 3,
    [UserRole.ADMIN]: 4,
    [UserRole.SUPER_ADMIN]: 5,
  };

  // 获取用户的最高角色层级
  const userLevel = Math.max(
    ...userRoles.map(role => roleHierarchy[role] || 0),
    0
  );
  const requiredLevel = roleHierarchy[minimumRole] || 0;

  return userLevel >= requiredLevel;
}

/**
 * 获取用户的最高角色
 */
export function getHighestRole(user: any): UserRole | null {
  if (!user) return null;

  // 支持旧的单一角色格式（向后兼容）
  const userRoles = Array.isArray(user.roles) 
    ? user.roles 
    : (user.role ? [user.role] : []);

  if (userRoles.length === 0) return null;

  const roleHierarchy: Record<UserRole, number> = {
    [UserRole.USER]: 1,
    [UserRole.CREATOR]: 2,
    [UserRole.REVIEWER]: 3,
    [UserRole.FACTORY_MANAGER]: 3,
    [UserRole.ADMIN]: 4,
    [UserRole.SUPER_ADMIN]: 5,
  };

  return userRoles.reduce((highest, role) => {
    const currentLevel = roleHierarchy[role] || 0;
    const highestLevel = roleHierarchy[highest] || 0;
    return currentLevel > highestLevel ? role : highest;
  }, userRoles[0]);
}

/**
 * 认证中间件包装器
 * 用于保护 API 路由
 */
export function withAuth(
  handler: (request: NextRequest, user: any) => Promise<NextResponse>,
  options?: {
    requiredRoles?: UserRole | UserRole[];
    requiredPermissions?: string | string[];
  }
) {
  return async (request: NextRequest) => {
    // 获取当前用户
    const user = await getCurrentUser(request);

    // 检查是否登录
    if (!user) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    // 检查账户状态
    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, message: '账户已被暂停或删除' },
        { status: 403 }
      );
    }

    // 检查角色权限
    if (options?.requiredRoles) {
      if (!hasRole(user, options.requiredRoles)) {
        return NextResponse.json(
          { success: false, message: '权限不足' },
          { status: 403 }
        );
      }
    }

    // 检查具体权限
    if (options?.requiredPermissions) {
      const permissions = Array.isArray(options.requiredPermissions)
        ? options.requiredPermissions
        : [options.requiredPermissions];

      const hasAllPermissions = permissions.every(permission =>
        hasPermission(user, permission)
      );

      if (!hasAllPermissions) {
        return NextResponse.json(
          { success: false, message: '权限不足' },
          { status: 403 }
        );
      }
    }

    // 执行实际处理函数
    return handler(request, user);
  };
}

/**
 * 创建受保护的 API 处理器
 */
export function createProtectedHandler(options: {
  requiredRoles?: UserRole | UserRole[];
  requiredPermissions?: string | string[];
}) {
  return (
    handler: (request: NextRequest, user: any, ...args: any[]) => Promise<NextResponse>
  ) => {
    return (...args: any[]) => {
      const request = args[0] as NextRequest;
      return withAuth(
        async (req, user) => handler(req, user, ...args.slice(1)),
        options
      )(request);
    };
  };
}


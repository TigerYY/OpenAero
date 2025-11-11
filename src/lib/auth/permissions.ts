/**
 * 权限定义和检查
 */

import { UserRole } from '@prisma/client';

/**
 * 系统权限列表
 */
export const PERMISSIONS = {
  // 用户管理
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  USERS_MANAGE_ROLES: 'users:manage_roles',

  // 方案管理
  SOLUTIONS_READ: 'solutions:read',
  SOLUTIONS_CREATE: 'solutions:create',
  SOLUTIONS_UPDATE: 'solutions:update',
  SOLUTIONS_DELETE: 'solutions:delete',
  SOLUTIONS_REVIEW: 'solutions:review',
  SOLUTIONS_PUBLISH: 'solutions:publish',

  // 订单管理
  ORDERS_READ: 'orders:read',
  ORDERS_CREATE: 'orders:create',
  ORDERS_UPDATE: 'orders:update',
  ORDERS_DELETE: 'orders:delete',
  ORDERS_MANAGE: 'orders:manage',

  // 工厂管理
  FACTORIES_READ: 'factories:read',
  FACTORIES_CREATE: 'factories:create',
  FACTORIES_UPDATE: 'factories:update',
  FACTORIES_DELETE: 'factories:delete',

  // 财务管理
  FINANCE_READ: 'finance:read',
  FINANCE_MANAGE: 'finance:manage',

  // 系统设置
  SETTINGS_READ: 'settings:read',
  SETTINGS_UPDATE: 'settings:update',

  // 审计日志
  AUDIT_LOGS_READ: 'audit_logs:read',
} as const;

/**
 * 角色默认权限映射
 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  // 普通用户
  [UserRole.USER]: [
    PERMISSIONS.SOLUTIONS_READ,
    PERMISSIONS.ORDERS_CREATE,
    PERMISSIONS.ORDERS_READ,
  ],

  // 创作者
  [UserRole.CREATOR]: [
    PERMISSIONS.SOLUTIONS_READ,
    PERMISSIONS.SOLUTIONS_CREATE,
    PERMISSIONS.SOLUTIONS_UPDATE,
    PERMISSIONS.SOLUTIONS_DELETE,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.FINANCE_READ,
  ],

  // 审核员
  [UserRole.REVIEWER]: [
    PERMISSIONS.SOLUTIONS_READ,
    PERMISSIONS.SOLUTIONS_REVIEW,
    PERMISSIONS.SOLUTIONS_PUBLISH,
    PERMISSIONS.USERS_READ,
  ],

  // 工厂管理员
  [UserRole.FACTORY_MANAGER]: [
    PERMISSIONS.SOLUTIONS_READ,
    PERMISSIONS.FACTORIES_READ,
    PERMISSIONS.FACTORIES_CREATE,
    PERMISSIONS.FACTORIES_UPDATE,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_UPDATE,
  ],

  // 管理员
  [UserRole.ADMIN]: [
    ...Object.values(PERMISSIONS).filter(p => 
      !p.startsWith('users:manage_roles') && !p.startsWith('settings:update')
    ),
  ],

  // 超级管理员 - 所有权限
  [UserRole.SUPER_ADMIN]: Object.values(PERMISSIONS),
};

/**
 * 获取角色的所有权限
 */
export function getRolePermissions(role: UserRole): string[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * 检查角色是否有某个权限
 */
export function roleHasPermission(role: UserRole, permission: string): boolean {
  const rolePermissions = getRolePermissions(role);
  return rolePermissions.includes(permission);
}

/**
 * 合并角色权限和自定义权限
 */
export function mergePermissions(role: UserRole, customPermissions: string[] = []): string[] {
  const rolePermissions = getRolePermissions(role);
  return Array.from(new Set([...rolePermissions, ...customPermissions]));
}

'use client';

import { useRouter, usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import { LoadingSpinner } from '@/components/layout/AppLayout';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { UserRole } from '@/lib/auth';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  fallback?: React.ComponentType;
  redirectTo?: string;
}

export function AuthGuard({ 
  children, 
  requiredRole, 
  fallback: Fallback,
  redirectTo = '/auth/login' 
}: AuthGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setShouldRender(false);
      return;
    }

    // 检查是否已认证
    if (!isAuthenticated) {
      // 保存当前路径用于登录后重定向
      if (typeof window !== 'undefined' && pathname) {
        localStorage.setItem('redirectAfterLogin', pathname);
      }
      
      if (Fallback) {
        setShouldRender(true);
        return;
      }
      
      router.replace(redirectTo);
      return;
    }

    // 检查角色权限
    if (requiredRole && user?.role !== requiredRole) {
      router.replace('/unauthorized');
      return;
    }

    setShouldRender(true);
  }, [isAuthenticated, isLoading, user, requiredRole, router, pathname, redirectTo, Fallback]);

  // 显示加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // 未认证且有fallback组件
  if (!isAuthenticated && Fallback) {
    return <Fallback />;
  }

  // 不应该渲染内容
  if (!shouldRender) {
    return null;
  }

  return <>{children}</>;
}

// 高阶组件版本
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    requiredRole?: UserRole;
    redirectTo?: string;
    fallback?: React.ComponentType;
  } = {}
) {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}

// 角色检查组件
export function RoleGuard({ 
  children, 
  allowedRoles, 
  fallback 
}: {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
}) {
  const { user, isAuthenticated } = useAuthContext();

  if (!isAuthenticated || !user) {
    return fallback || (
      <div className="text-center py-8">
        <p className="text-gray-600">请先登录</p>
      </div>
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return fallback || (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">访问被拒绝</h2>
        <p className="text-gray-600">您没有访问此内容的权限</p>
      </div>
    );
  }

  return <>{children}</>;
}

// 权限检查组件
export function PermissionGuard({ 
  children, 
  permission, 
  fallback 
}: {
  children: React.ReactNode;
  permission: string;
  fallback?: React.ReactNode;
}) {
  const { user, isAuthenticated } = useAuthContext();

  if (!isAuthenticated || !user) {
    return fallback || (
      <div className="text-center py-8">
        <p className="text-gray-600">请先登录</p>
      </div>
    );
  }

  const hasPermission = user.permissions?.some(p => 
    `${p.resource}_${p.action}` === permission || p.id === permission
  );

  if (!hasPermission) {
    return fallback || (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">权限不足</h2>
        <p className="text-gray-600">您没有执行此操作的权限</p>
      </div>
    );
  }

  return <>{children}</>;
}

// 条件渲染组件
export function ConditionalRender({ 
  condition, 
  children, 
  fallback 
}: {
  condition: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return condition ? <>{children}</> : <>{fallback}</>;
}

// 认证状态组件
export function AuthStatus() {
  const { user, isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) {
    return <LoadingSpinner size="sm" />;
  }

  if (!isAuthenticated) {
    return (
      <span className="text-sm text-gray-500">未登录</span>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
      <span className="text-sm text-gray-700">
        {user?.username || user?.email}
      </span>
      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
        {user?.role}
      </span>
    </div>
  );
}
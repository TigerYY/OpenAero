'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRouting } from '@/lib/routing';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRoles?: string[];
  redirectTo?: string;
  fallback?: React.ReactNode;
}

/**
 * 路由保护组件
 * 用于保护需要认证或特定权限的页面
 */
export function ProtectedRoute({
  children,
  requireAuth = true,
  requiredRoles = [],
  redirectTo,
  fallback,
}: ProtectedRouteProps) {
  const { isAuthenticated, hasRole, loading, profile, user } = useAuth();
  const router = useRouter();
  const { route, routes } = useRouting();
  
  // 默认重定向路径
  const defaultRedirectTo = redirectTo || route(routes.AUTH.LOGIN);

  useEffect(() => {
    console.log('[ProtectedRoute] 状态检查:', {
      loading,
      isAuthenticated,
      requireAuth,
      requiredRoles,
      hasRequiredRole: requiredRoles.length > 0 ? hasRole(requiredRoles) : true,
      profileRole: profile?.role,
      userId: user?.id,
    });

    if (loading) {
      console.log('[ProtectedRoute] 仍在加载中，等待...');
      return;
    }

    // 需要认证但未登录
    if (requireAuth && !isAuthenticated) {
      console.log('[ProtectedRoute] 未认证，重定向到登录页');
      router.push(defaultRedirectTo);
      return;
    }

    // 需要特定角色但用户没有
    if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
      console.log('[ProtectedRoute] 权限不足，当前角色:', profile?.role, '需要角色:', requiredRoles);
      router.push(route('/unauthorized'));
      return;
    }

    console.log('[ProtectedRoute] 权限验证通过，允许访问');
  }, [isAuthenticated, hasRole, loading, requireAuth, requiredRoles, defaultRedirectTo, route, router, profile, user]);

  // 加载中显示 fallback
  if (loading) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        </div>
      )
    );
  }

  // 未认证
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  // 权限不足
  if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    return null;
  }

  return <>{children}</>;
}

/**
 * 管理员路由保护
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { route } = useRouting();
  
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'SUPER_ADMIN']} redirectTo={route('/unauthorized')}>
      {children}
    </ProtectedRoute>
  );
}

/**
 * 创作者路由保护
 */
export function CreatorRoute({ children }: { children: React.ReactNode }) {
  const { route, routes } = useRouting();
  
  return (
    <ProtectedRoute
      requiredRoles={['CREATOR', 'ADMIN', 'SUPER_ADMIN']}
      redirectTo={route(routes.BUSINESS.CREATORS_APPLY)}
    >
      {children}
    </ProtectedRoute>
  );
}

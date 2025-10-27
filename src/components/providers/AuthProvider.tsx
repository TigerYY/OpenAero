'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSessionManager } from '@/hooks/useSessionManager';
import { SessionExpiredModal } from '@/components/auth/SessionExpiredModal';
import { User, AuthSession } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<AuthSession>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<AuthSession>;
  updateProfile: (updates: Partial<User>) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuth();
  const sessionManager = useSessionManager();

  // 监听认证状态变化
  useEffect(() => {
    // 如果用户已登录，初始化会话管理
    if (auth.isAuthenticated) {
      console.log('用户已认证，初始化会话管理');
    }
  }, [auth.isAuthenticated]);

  // 处理全局错误
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('全局错误:', event.error);
      
      // 如果是认证相关错误，触发会话过期处理
      if (event.error?.message?.includes('401') || 
          event.error?.message?.includes('Unauthorized') ||
          event.error?.message?.includes('Token expired')) {
        sessionManager.handleSessionExpired();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('未处理的Promise拒绝:', event.reason);
      
      // 检查是否是认证错误
      if (event.reason?.status === 401 || 
          event.reason?.message?.includes('401') ||
          event.reason?.message?.includes('Token expired')) {
        sessionManager.handleSessionExpired();
      }
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [sessionManager]);

  const contextValue: AuthContextType = {
    user: auth.user,
    session: auth.session,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    login: auth.login,
    logout: auth.logout,
    refreshToken: auth.refreshToken,
    updateProfile: auth.updateProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      
      {/* 会话过期模态框 */}
      <SessionExpiredModal
        isOpen={sessionManager.showSessionExpiredModal}
        onClose={sessionManager.closeSessionModal}
        onRefresh={sessionManager.handleRefreshSession}
        onLogin={sessionManager.handleRedirectToLogin}
        autoRefreshAttempts={sessionManager.autoRefreshAttempts}
      />
    </AuthContext.Provider>
  );
}

// Hook for using auth context
export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

// 高阶组件：需要认证的页面
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    redirectTo?: string;
    requiredRole?: string;
    fallback?: React.ComponentType;
  } = {}
) {
  const { redirectTo = '/auth/login', requiredRole, fallback: Fallback } = options;

  return function AuthenticatedComponent(props: P) {
    const { user, isAuthenticated, isLoading } = useAuthContext();

    // 显示加载状态
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    // 检查是否已认证
    if (!isAuthenticated) {
      if (Fallback) {
        return <Fallback {...props} />;
      }
      
      // 重定向到登录页面
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname + window.location.search;
        localStorage.setItem('redirectAfterLogin', currentPath);
        window.location.href = redirectTo;
      }
      return null;
    }

    // 检查角色权限
    if (requiredRole && user?.role !== requiredRole) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">访问被拒绝</h1>
            <p className="text-gray-600">您没有访问此页面的权限。</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

// Hook：检查权限
export function usePermissions() {
  const { user } = useAuthContext();

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some(role => user?.role === role);
  };

  const isAdmin = (): boolean => {
    return user?.role === 'admin';
  };

  const isModerator = (): boolean => {
    return user?.role === 'moderator';
  };

  const isUser = (): boolean => {
    return user?.role === 'user';
  };

  const isGuest = (): boolean => {
    return user?.role === 'guest';
  };

  return {
    user,
    hasRole,
    hasAnyRole,
    isAdmin,
    isModerator,
    isUser,
    isGuest,
  };
}
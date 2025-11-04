import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouting } from '@/lib/routing';

import { useAuth } from './useAuth';

interface UseSessionManagerReturn {
  showSessionExpiredModal: boolean;
  autoRefreshAttempts: number;
  handleSessionExpired: () => void;
  handleRefreshSession: () => Promise<void>;
  handleRedirectToLogin: () => void;
  closeSessionModal: () => void;
}

export function useSessionManager(): UseSessionManagerReturn {
  const { session, refreshToken, logout } = useAuth();
  const router = useRouter();
  const { route, routes } = useRouting();
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
  const [autoRefreshAttempts, setAutoRefreshAttempts] = useState(0);
  const maxAutoRefreshAttempts = 3;
  const refreshAttemptRef = useRef(0);

  // 处理会话过期
  const handleSessionExpired = useCallback(() => {
    console.log('会话过期，显示提示模态框');
    setShowSessionExpiredModal(true);
  }, []);

  // 自动刷新会话
  const attemptAutoRefresh = useCallback(async (): Promise<boolean> => {
    if (refreshAttemptRef.current >= maxAutoRefreshAttempts) {
      return false;
    }

    try {
      refreshAttemptRef.current += 1;
      setAutoRefreshAttempts(refreshAttemptRef.current);
      
      console.log(`尝试自动刷新会话 (${refreshAttemptRef.current}/${maxAutoRefreshAttempts})`);
      await refreshToken();
      
      // 刷新成功，重置计数器
      refreshAttemptRef.current = 0;
      setAutoRefreshAttempts(0);
      return true;
    } catch (error) {
      console.error(`自动刷新失败 (${refreshAttemptRef.current}/${maxAutoRefreshAttempts}):`, error);
      
      if (refreshAttemptRef.current >= maxAutoRefreshAttempts) {
        console.log('达到最大自动刷新次数，显示会话过期提示');
        handleSessionExpired();
        return false;
      }
      
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, 2000 * refreshAttemptRef.current));
      return attemptAutoRefresh();
    }
  }, [refreshToken, handleSessionExpired]);

  // 手动刷新会话
  const handleRefreshSession = useCallback(async (): Promise<void> => {
    try {
      await refreshToken();
      setShowSessionExpiredModal(false);
      setAutoRefreshAttempts(0);
      refreshAttemptRef.current = 0;
    } catch (error) {
      console.error('手动刷新会话失败:', error);
      throw error;
    }
  }, [refreshToken]);

  // 重定向到登录页面
  const handleRedirectToLogin = useCallback(() => {
    logout();
    setShowSessionExpiredModal(false);
    setAutoRefreshAttempts(0);
    refreshAttemptRef.current = 0;
    
    // 保存当前页面路径，登录后可以返回
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath !== '/auth/login') {
      localStorage.setItem('redirectAfterLogin', currentPath);
    }
    
    router.push(route(routes.AUTH.LOGIN));
  }, [logout, router]);

  // 关闭会话模态框
  const closeSessionModal = useCallback(() => {
    setShowSessionExpiredModal(false);
  }, []);

  // 监听API请求错误，检测401状态码
  useEffect(() => {
    const handleApiError = (event: CustomEvent) => {
      const { status, response } = event.detail;
      
      if (status === 401) {
        console.log('检测到401错误，尝试自动刷新会话');
        attemptAutoRefresh();
      }
    };

    // 监听自定义的API错误事件
    window.addEventListener('apiError', handleApiError as EventListener);
    
    return () => {
      window.addEventListener('apiError', handleApiError as EventListener);
    };
  }, [attemptAutoRefresh]);

  // 监听网络状态变化
  useEffect(() => {
    const handleOnline = () => {
      console.log('网络连接恢复，检查会话状态');
      if (session && refreshAttemptRef.current > 0) {
        attemptAutoRefresh();
      }
    };

    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [session, attemptAutoRefresh]);

  // 监听窗口焦点变化
  useEffect(() => {
    const handleFocus = () => {
      if (session && refreshAttemptRef.current > 0) {
        console.log('窗口重新获得焦点，检查会话状态');
        attemptAutoRefresh();
      }
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [session, attemptAutoRefresh]);

  return {
    showSessionExpiredModal,
    autoRefreshAttempts,
    handleSessionExpired,
    handleRefreshSession,
    handleRedirectToLogin,
    closeSessionModal,
  };
}
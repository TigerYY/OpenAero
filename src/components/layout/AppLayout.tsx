'use client';

import React from 'react';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { toast } from 'sonner';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    </AuthProvider>
  );
}

// 页面包装器组件
export function PageWrapper({ 
  children, 
  className = '',
  maxWidth = 'max-w-7xl' 
}: { 
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
}) {
  return (
    <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${maxWidth} ${className}`}>
      {children}
    </div>
  );
}

// 内容区域组件
export function ContentArea({ 
  children, 
  className = '',
  padding = 'py-8' 
}: { 
  children: React.ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <main className={`${padding} ${className}`}>
      {children}
    </main>
  );
}

// 卡片容器组件
export function Card({ 
  children, 
  className = '',
  padding = 'p-6' 
}: { 
  children: React.ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${padding} ${className}`}>
      {children}
    </div>
  );
}

// 加载状态组件
export function LoadingSpinner({ 
  size = 'md',
  className = '' 
}: { 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]} ${className}`} />
  );
}

// 页面加载状态
export function PageLoading({ message = '加载中...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}

// 错误状态组件
export function ErrorState({ 
  title = '出错了',
  message = '请稍后重试',
  onRetry,
  className = ''
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={`text-center ${className}`}>
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          重试
        </button>
      )}
    </div>
  );
}

// 空状态组件
export function EmptyState({ 
  title = '暂无数据',
  message = '还没有任何内容',
  action,
  className = ''
}: {
  title?: string;
  message?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`text-center ${className}`}>
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
        <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1m8 0V4.5" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{message}</p>
      {action}
    </div>
  );
}
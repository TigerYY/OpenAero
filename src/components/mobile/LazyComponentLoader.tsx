'use client';

import React, { Suspense, lazy, ComponentType, ReactNode } from 'react';

// 加载状态组件
interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  message = '加载中...', 
  className = '' 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]}`}></div>
      {message && (
        <p className="mt-3 text-sm text-gray-600 animate-pulse">{message}</p>
      )}
    </div>
  );
};

// 错误边界组件
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class LazyLoadErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static override getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LazyLoad Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="w-12 h-12 text-red-500 mb-3">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 mb-2">组件加载失败</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// 懒加载组件包装器
interface LazyComponentWrapperProps {
  children: ReactNode;
  loading?: ReactNode;
  error?: ReactNode;
  delay?: number;
}

const LazyComponentWrapper: React.FC<LazyComponentWrapperProps> = ({
  children,
  loading,
  error,
  delay = 200
}) => {
  const [showLoading, setShowLoading] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const defaultLoading = showLoading ? (
    loading || <LoadingSpinner />
  ) : (
    <div className="h-8"></div> // 占位符，避免布局跳动
  );

  return (
    <LazyLoadErrorBoundary fallback={error}>
      <Suspense fallback={defaultLoading}>
        {children}
      </Suspense>
    </LazyLoadErrorBoundary>
  );
};

// 懒加载工厂函数
interface LazyLoadOptions {
  loading?: ReactNode;
  error?: ReactNode;
  delay?: number;
  preload?: boolean;
}

export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
) {
  const LazyComponent = lazy(importFn);
  
  // 预加载功能
  if (options.preload) {
    // 在空闲时间预加载组件
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(() => {
        importFn().catch(console.error);
      });
    } else {
      // 降级到 setTimeout
      setTimeout(() => {
        importFn().catch(console.error);
      }, 100);
    }
  }

  const WrappedComponent: React.FC<React.ComponentProps<T>> = (props) => (
    <LazyComponentWrapper
      loading={options.loading}
      error={options.error}
      delay={options.delay}
    >
      <LazyComponent {...props} />
    </LazyComponentWrapper>
  );

  // 保持组件名称用于调试
  const componentName = (LazyComponent as any).displayName || (LazyComponent as any).name || 'Component';
  WrappedComponent.displayName = `LazyLoaded(${componentName})`;

  return WrappedComponent;
}

// 移动端特定的懒加载组件
export const MobileLazyLoader = {
  // 创建移动端优化的懒加载组件
  create: <T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    options: LazyLoadOptions & { mobileOptimized?: boolean } = {}
  ) => {
    const defaultOptions: LazyLoadOptions = {
      delay: options.mobileOptimized ? 100 : 200, // 移动端更快显示加载状态
      loading: <LoadingSpinner size="small" message="正在加载..." />,
      ...options
    };

    return createLazyComponent(importFn, defaultOptions);
  },

  // 预加载组件（用于关键路径）
  preload: <T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>
  ) => {
    if (typeof window !== 'undefined') {
      // 使用 requestIdleCallback 在浏览器空闲时预加载
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => importFn().catch(console.error));
      } else {
        setTimeout(() => importFn().catch(console.error), 0);
      }
    }
  },

  // 批量预加载
  preloadBatch: (importFns: Array<() => Promise<any>>) => {
    if (typeof window !== 'undefined') {
      importFns.forEach((importFn, index) => {
        const delay = index * 50; // 错开加载时间
        setTimeout(() => {
          importFn().catch(console.error);
        }, delay);
      });
    }
  }
};

// 导出组件和工具
export { LoadingSpinner, LazyComponentWrapper, LazyLoadErrorBoundary };
export default createLazyComponent;
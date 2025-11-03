'use client';

import React, { Component, ReactNode } from 'react';

import { Locale } from '@/types/i18n';

// 错误边界状态接口
interface I18nErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  locale: Locale | null;
}

// 错误边界属性接口
interface I18nErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  locale?: Locale;
}

/**
 * i18n 错误边界组件
 * 捕获翻译相关的错误并提供友好的错误界面
 */
export class I18nErrorBoundary extends Component<
  I18nErrorBoundaryProps,
  I18nErrorBoundaryState
> {
  constructor(props: I18nErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      locale: props.locale || null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<I18nErrorBoundaryState> {
    // 检查是否是 i18n 相关错误
    const isI18nError = 
      error.message.includes('i18n') ||
      error.message.includes('translation') ||
      error.message.includes('locale') ||
      error.message.includes('language') ||
      error.stack?.includes('I18nContext') ||
      error.stack?.includes('useTranslation') ||
      error.stack?.includes('useLanguageSwitcher');

    if (isI18nError) {
      return {
        hasError: true,
        error,
      };
    }

    // 不是 i18n 相关错误，不处理
    return { hasError: false };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 记录错误信息
    this.setState({
      error,
      errorInfo,
    });

    // 调用错误处理回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 记录到控制台
    console.error('I18n Error Boundary caught an error:', error, errorInfo);

    // 可以在这里添加错误报告逻辑
    this.reportError(error, errorInfo);
  }

  // 报告错误到监控服务
  private reportError = (error: Error, errorInfo: React.ErrorInfo) => {
    try {
      // 这里可以集成 Sentry 或其他错误监控服务
      // if (typeof window !== 'undefined' && (window as any).Sentry) {
      //   (window as any).Sentry.captureException(error, {
      //     contexts: {
      //       react: {
      //         componentStack: errorInfo.componentStack,
      //       },
      //     },
      //   });
      // }
    } catch (reportingError) {
      console.warn('Failed to report i18n error:', reportingError);
    }
  };

  // 重置错误状态
  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  // 重试加载翻译
  private handleRetry = () => {
    this.handleReset();
    // 可以触发重新加载翻译
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      // 使用自定义错误界面
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误界面
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            
            <h2 className="text-lg font-medium text-gray-900 text-center mb-2">
              Translation Error
            </h2>
            
            <p className="text-sm text-gray-600 text-center mb-6">
              There was an error loading the translations. This might be due to a network issue or a problem with the translation files.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <h3 className="text-sm font-medium text-red-800 mb-2">Error Details:</h3>
                <p className="text-xs text-red-700 font-mono">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-600 cursor-pointer">
                      Stack Trace
                    </summary>
                    <pre className="text-xs text-red-600 mt-1 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={this.handleRetry}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Retry
              </button>
              
              <button
                onClick={this.handleReset}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Continue
              </button>
            </div>

            {this.state.locale && (
              <p className="text-xs text-gray-500 text-center mt-4">
                Current locale: {this.state.locale}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 函数式错误边界组件（用于函数组件）
export function I18nErrorBoundaryFunction({
  children,
  fallback,
  onError,
  locale,
}: I18nErrorBoundaryProps) {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const isI18nError = 
        event.message.includes('i18n') ||
        event.message.includes('translation') ||
        event.message.includes('locale') ||
        event.message.includes('language');

      if (isI18nError) {
        setHasError(true);
        setError(new Error(event.message));
        
        if (onError) {
          onError(new Error(event.message), {
            componentStack: event.filename ? `at ${event.filename}:${event.lineno}:${event.colno}` : '',
          });
        }
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [onError]);

  if (hasError) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <h3 className="text-red-800 font-medium">Translation Error</h3>
        <p className="text-red-600 text-sm mt-1">
          There was an error loading translations. Please refresh the page.
        </p>
        {error && (
          <p className="text-red-500 text-xs mt-2 font-mono">
            {error.message}
          </p>
        )}
        {locale && (
          <p className="text-red-500 text-xs mt-1">
            Locale: {locale}
          </p>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

export default I18nErrorBoundary;

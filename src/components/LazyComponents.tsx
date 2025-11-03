import React, { Suspense } from 'react';

import { createLazyComponent } from '@/lib/performance';

// 懒加载的组件定义（示例组件，实际使用时需要替换为真实的组件路径）
const DashboardComponent = () => <div className="p-4">Dashboard组件</div>;
const ProfileComponent = () => <div className="p-4">Profile组件</div>;
const SettingsComponent = () => <div className="p-4">Settings组件</div>;
const AnalyticsComponent = () => <div className="p-4">Analytics组件</div>;
const ReportsComponent = () => <div className="p-4">Reports组件</div>;

export const LazyDashboard = createLazyComponent(
  () => Promise.resolve({ default: DashboardComponent }),
  { chunkName: 'dashboard', preload: true }
);

export const LazyProfile = createLazyComponent(
  () => Promise.resolve({ default: ProfileComponent }),
  { chunkName: 'profile' }
);

export const LazySettings = createLazyComponent(
  () => Promise.resolve({ default: SettingsComponent }),
  { chunkName: 'settings' }
);

export const LazyAnalytics = createLazyComponent(
  () => Promise.resolve({ default: AnalyticsComponent }),
  { chunkName: 'analytics' }
);

export const LazyReports = createLazyComponent(
  () => Promise.resolve({ default: ReportsComponent }),
  { chunkName: 'reports' }
);

// 加载中组件
export const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">加载中...</span>
  </div>
);

// 错误边界组件
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class LazyLoadErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('懒加载组件错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">加载失败</h3>
          <p className="text-gray-600 mb-4">组件加载时出现错误，请刷新页面重试。</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            刷新页面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// 懒加载包装器组件
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const LazyWrapper: React.FC<LazyWrapperProps> = ({ 
  children, 
  fallback = <LoadingSpinner /> 
}) => (
  <LazyLoadErrorBoundary>
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  </LazyLoadErrorBoundary>
);

// 路由级别的懒加载组件
export const LazyRoute: React.FC<{
  component: React.ComponentType<any>;
  props?: any;
}> = ({ component: Component, props = {} }) => (
  <LazyWrapper>
    <Component {...props} />
  </LazyWrapper>
);
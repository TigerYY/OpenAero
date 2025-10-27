import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';

interface PerformanceContextType {
  isOptimized: boolean;
  metrics: any;
  prefetchResources: (resources: string[]) => void;
  optimizeMemory: () => void;
  getPerformanceReport: () => any;
}

const PerformanceContext = createContext<PerformanceContextType | null>(null);

interface MobilePerformanceProviderProps {
  children: React.ReactNode;
  enableLazyLoading?: boolean;
  enableImageOptimization?: boolean;
  enableResourcePrefetch?: boolean;
  enableMemoryOptimization?: boolean;
}

export function MobilePerformanceProvider({
  children,
  enableLazyLoading = true,
  enableImageOptimization = true,
  enableResourcePrefetch = true,
  enableMemoryOptimization = true
}: MobilePerformanceProviderProps) {
  const {
    metrics,
    isOptimized,
    prefetchCriticalResources,
    optimizeMemory,
    getPerformanceReport
  } = usePerformanceOptimization({
    enableLazyLoading,
    enableImageOptimization,
    enableResourcePrefetch,
    enableMemoryOptimization
  });

  const [isLowEndDevice, setIsLowEndDevice] = useState(false);

  // 检测低端设备
  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    const checkDeviceCapabilities = () => {
      // 检查内存
      const memory = (navigator as any).deviceMemory;
      const isLowMemory = memory && memory <= 2;

      // 检查CPU核心数
      const cores = navigator.hardwareConcurrency;
      const isLowCPU = cores && cores <= 2;

      // 检查网络连接
      const connection = (navigator as any).connection;
      const isSlowConnection = connection && 
        (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g');

      setIsLowEndDevice(isLowMemory || isLowCPU || isSlowConnection);
    };

    checkDeviceCapabilities();
  }, []);

  // 为低端设备应用额外优化
  useEffect(() => {
    if (!isLowEndDevice) return;

    // 减少动画
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    `;
    document.head.appendChild(style);

    // 禁用某些视觉效果
    document.documentElement.classList.add('reduce-motion');

    return () => {
      document.head.removeChild(style);
      document.documentElement.classList.remove('reduce-motion');
    };
  }, [isLowEndDevice]);

  const contextValue: PerformanceContextType = {
    isOptimized,
    metrics,
    prefetchResources: prefetchCriticalResources,
    optimizeMemory,
    getPerformanceReport
  };

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
      {/* 性能监控指示器（仅在开发环境显示） */}
      {process.env.NODE_ENV === 'development' && (
        <PerformanceIndicator 
          metrics={metrics} 
          isOptimized={isOptimized}
          isLowEndDevice={isLowEndDevice}
        />
      )}
    </PerformanceContext.Provider>
  );
}

// 性能指示器组件
function PerformanceIndicator({ 
  metrics, 
  isOptimized, 
  isLowEndDevice 
}: { 
  metrics: any; 
  isOptimized: boolean;
  isLowEndDevice: boolean;
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        title="性能监控"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </button>

      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-white rounded-lg shadow-xl p-4 min-w-64 border">
          <h3 className="font-semibold text-gray-900 mb-2">性能监控</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>优化状态:</span>
              <span className={isOptimized ? 'text-green-600' : 'text-yellow-600'}>
                {isOptimized ? '已优化' : '优化中'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>设备类型:</span>
              <span className={isLowEndDevice ? 'text-red-600' : 'text-green-600'}>
                {isLowEndDevice ? '低端设备' : '正常设备'}
              </span>
            </div>

            {metrics && (
              <>
                <div className="flex justify-between">
                  <span>加载时间:</span>
                  <span>{Math.round(metrics.loadTime)}ms</span>
                </div>
                
                <div className="flex justify-between">
                  <span>内存使用:</span>
                  <span>{Math.round(metrics.memoryUsage / 1024 / 1024)}MB</span>
                </div>
                
                <div className="flex justify-between">
                  <span>网络类型:</span>
                  <span>{metrics.networkSpeed}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>设备类型:</span>
                  <span>{metrics.deviceType}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Hook 用于使用性能上下文
export function usePerformanceContext() {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformanceContext must be used within MobilePerformanceProvider');
  }
  return context;
}
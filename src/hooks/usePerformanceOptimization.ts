import { useEffect, useCallback, useRef, useState } from 'react';

import { performanceMonitor, PerformanceUtils } from '@/lib/performance';

interface PerformanceOptimizationOptions {
  enableLazyLoading?: boolean;
  enableImageOptimization?: boolean;
  enableResourcePrefetch?: boolean;
  enableMemoryOptimization?: boolean;
  debounceDelay?: number;
  throttleLimit?: number;
}

interface PerformanceMetrics {
  loadTime: number;
  memoryUsage: number;
  networkSpeed: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  connectionType: string;
}

export function usePerformanceOptimization(options: PerformanceOptimizationOptions = {}) {
  const {
    enableLazyLoading = true,
    enableImageOptimization = true,
    enableResourcePrefetch = true,
    enableMemoryOptimization = true,
    debounceDelay = 300,
    throttleLimit = 100
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isOptimized, setIsOptimized] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const prefetchedResources = useRef<Set<string>>(new Set());

  // 检测设备类型
  const detectDeviceType = useCallback((): 'mobile' | 'tablet' | 'desktop' => {
    if (typeof window === 'undefined') return 'desktop';
    
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }, []);

  // 获取网络连接信息
  const getConnectionInfo = useCallback(() => {
    if (typeof navigator === 'undefined' || !('connection' in navigator)) {
      return { effectiveType: 'unknown', downlink: 0 };
    }
    
    const connection = (navigator as any).connection;
    return {
      effectiveType: connection.effectiveType || 'unknown',
      downlink: connection.downlink || 0
    };
  }, []);

  // 收集性能指标
  const collectMetrics = useCallback(() => {
    if (typeof window === 'undefined') return;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const connection = getConnectionInfo();
    
    const newMetrics: PerformanceMetrics = {
      loadTime: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
      networkSpeed: connection.effectiveType,
      deviceType: detectDeviceType(),
      connectionType: connection.effectiveType
    };

    setMetrics(newMetrics);
    
    // 启动性能监控
    performanceMonitor.startNewMetric();
  }, [detectDeviceType, getConnectionInfo]);

  // 懒加载图片优化
  const initializeLazyLoading = useCallback(() => {
    if (!enableLazyLoading || typeof window === 'undefined') return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            
            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
              img.classList.add('loaded');
              observerRef.current?.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.01
      }
    );

    // 观察所有懒加载图片
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => observerRef.current?.observe(img));
  }, [enableLazyLoading]);

  // 预取关键资源
  const prefetchCriticalResources = useCallback((resources: string[]) => {
    if (!enableResourcePrefetch || typeof window === 'undefined') return;

    resources.forEach(resource => {
      if (prefetchedResources.current.has(resource)) return;

      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = resource;
      
      link.onload = () => prefetchedResources.current.add(resource);
      link.onerror = () => console.warn(`Failed to prefetch: ${resource}`);
      
      document.head.appendChild(link);
    });
  }, [enableResourcePrefetch]);

  // 内存优化
  const optimizeMemory = useCallback(() => {
    if (!enableMemoryOptimization || typeof window === 'undefined') return;

    // 清理未使用的图片
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (!img.complete || img.naturalHeight === 0) {
        img.loading = 'lazy';
      }
    });

    // 清理过期的缓存
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('old') || cacheName.includes('expired')) {
            caches.delete(cacheName);
          }
        });
      });
    }

    // 垃圾回收提示
    if (window.gc) {
      window.gc();
    }
  }, [enableMemoryOptimization]);

  // 防抖函数
  const debouncedFunction = useCallback(
    <T extends (...args: any[]) => any>(func: T) => {
      return PerformanceUtils.debounce(func, debounceDelay);
    },
    [debounceDelay]
  );

  // 节流函数
  const throttledFunction = useCallback(
    <T extends (...args: any[]) => any>(func: T) => {
      return PerformanceUtils.throttle(func, throttleLimit);
    },
    [throttleLimit]
  );

  // 在空闲时执行任务
  const runWhenIdle = useCallback((callback: () => void, timeout?: number) => {
    PerformanceUtils.runWhenIdle(callback, timeout);
  }, []);

  // 批量DOM更新
  const batchDOMUpdates = useCallback((updates: (() => void)[]) => {
    PerformanceUtils.batchDOMUpdates(updates);
  }, []);

  // 优化移动端滚动性能
  const optimizeScrollPerformance = useCallback(() => {
    if (typeof window === 'undefined') return;

    // 添加 passive 事件监听器
    const passiveSupported = (() => {
      let passive = false;
      try {
        const options = {
          get passive() {
            passive = true;
            return false;
          }
        } as AddEventListenerOptions;
        const testFn = () => {};
        window.addEventListener('scroll', testFn, options);
        window.removeEventListener('scroll', testFn);
      } catch (err) {
        passive = false;
      }
      return passive;
    })();

    if (passiveSupported) {
      // 为滚动事件添加 passive 监听器
      document.addEventListener('touchstart', () => {}, { passive: true });
      document.addEventListener('touchmove', () => {}, { passive: true });
      document.addEventListener('wheel', () => {}, { passive: true });
    }

    // 优化滚动容器
    const scrollContainers = document.querySelectorAll('[data-scroll-container]');
    scrollContainers.forEach(container => {
      const element = container as HTMLElement;
      // 使用 setProperty 来设置 webkit 前缀的样式
      element.style.setProperty('-webkit-overflow-scrolling', 'touch');
      element.style.setProperty('overflow-scrolling', 'touch');
    });
  }, []);

  // 初始化所有优化
  const initializeOptimizations = useCallback(() => {
    collectMetrics();
    initializeLazyLoading();
    optimizeScrollPerformance();
    
    // 延迟执行内存优化
    runWhenIdle(() => {
      optimizeMemory();
      setIsOptimized(true);
    }, 2000);
  }, [collectMetrics, initializeLazyLoading, optimizeScrollPerformance, runWhenIdle, optimizeMemory]);

  // 获取性能报告
  const getPerformanceReport = useCallback(() => {
    return performanceMonitor.getPerformanceReport();
  }, []);

  // 清理资源
  const cleanup = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    performanceMonitor.disconnect();
  }, []);

  // 初始化
  useEffect(() => {
    initializeOptimizations();
    return cleanup;
  }, [initializeOptimizations, cleanup]);

  // 监听窗口大小变化
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = throttledFunction(() => {
      collectMetrics();
    });

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [throttledFunction, collectMetrics]);

  return {
    metrics,
    isOptimized,
    prefetchCriticalResources,
    optimizeMemory,
    debouncedFunction,
    throttledFunction,
    runWhenIdle,
    batchDOMUpdates,
    getPerformanceReport,
    cleanup
  };
}
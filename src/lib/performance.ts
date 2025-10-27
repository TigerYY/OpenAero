// 性能优化库 - 代码分割、缓存策略、性能监控

import { lazy, ComponentType } from 'react';

// 性能指标接口
export interface PerformanceMetrics {
  id: string;
  timestamp: string;
  url: string;
  userAgent: string;
  metrics: {
    // Core Web Vitals
    LCP?: number; // Largest Contentful Paint
    FID?: number; // First Input Delay
    CLS?: number; // Cumulative Layout Shift
    FCP?: number; // First Contentful Paint
    TTFB?: number; // Time to First Byte
    
    // 自定义指标
    loadTime?: number;
    domContentLoaded?: number;
    firstPaint?: number;
    memoryUsage?: number;
    connectionType?: string;
  };
  resources: {
    totalSize: number;
    totalRequests: number;
    cacheHitRate: number;
    slowestResource?: {
      name: string;
      duration: number;
      size: number;
    };
  };
}

// 缓存配置
export interface CacheConfig {
  name: string;
  version: string;
  maxAge: number; // 毫秒
  maxSize: number; // 字节
  strategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
}

// 代码分割配置
export interface CodeSplittingConfig {
  chunkName: string;
  preload?: boolean;
  prefetch?: boolean;
  webpackChunkName?: string;
}

// 懒加载组件工厂
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  config?: CodeSplittingConfig
): ComponentType<T extends ComponentType<infer P> ? P : never> {
  const LazyComponent = lazy(() => {
    // 添加预加载逻辑
    if (config?.preload) {
      // 在空闲时间预加载
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => importFn());
      } else {
        setTimeout(() => importFn(), 100);
      }
    }
    
    return importFn();
  });

  return LazyComponent as any;
}

// 预加载资源
export function preloadResource(href: string, as: string = 'script'): void {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  
  // 避免重复预加载
  const existing = document.querySelector(`link[href="${href}"]`);
  if (!existing) {
    document.head.appendChild(link);
  }
}

// 预获取资源
export function prefetchResource(href: string): void {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  
  const existing = document.querySelector(`link[href="${href}"][rel="prefetch"]`);
  if (!existing) {
    document.head.appendChild(link);
  }
}

// 缓存管理器
export class CacheManager {
  private cache: Cache | null = null;
  private config: CacheConfig;
  private memoryCache = new Map<string, { data: any; timestamp: number; size: number }>();
  private currentSize = 0;

  constructor(config: CacheConfig) {
    this.config = config;
    this.initCache();
  }

  private async initCache(): Promise<void> {
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        this.cache = await caches.open(`${this.config.name}-v${this.config.version}`);
      } catch (error) {
        console.warn('缓存初始化失败:', error);
      }
    }
  }

  // 设置缓存
  async set(key: string, data: any, options?: { ttl?: number }): Promise<void> {
    const ttl = options?.ttl || this.config.maxAge;
    const timestamp = Date.now();
    const serialized = JSON.stringify(data);
    const size = new Blob([serialized]).size;

    // 检查大小限制
    if (this.currentSize + size > this.config.maxSize) {
      await this.evictLRU();
    }

    // 内存缓存
    this.memoryCache.set(key, {
      data,
      timestamp: timestamp + ttl,
      size
    });
    this.currentSize += size;

    // 浏览器缓存
    if (this.cache) {
      try {
        const response = new Response(serialized, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `max-age=${Math.floor(ttl / 1000)}`,
            'X-Timestamp': timestamp.toString(),
            'X-TTL': ttl.toString()
          }
        });
        await this.cache.put(key, response);
      } catch (error) {
        console.warn('浏览器缓存设置失败:', error);
      }
    }
  }

  // 获取缓存
  async get(key: string): Promise<any | null> {
    const now = Date.now();

    // 先检查内存缓存
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem) {
      if (now < memoryItem.timestamp) {
        return memoryItem.data;
      } else {
        // 过期，删除
        this.memoryCache.delete(key);
        this.currentSize -= memoryItem.size;
      }
    }

    // 检查浏览器缓存
    if (this.cache) {
      try {
        const response = await this.cache.match(key);
        if (response) {
          const timestamp = parseInt(response.headers.get('X-Timestamp') || '0');
          const ttl = parseInt(response.headers.get('X-TTL') || '0');
          
          if (now < timestamp + ttl) {
            const data = await response.json();
            
            // 重新加入内存缓存
            const size = new Blob([JSON.stringify(data)]).size;
            this.memoryCache.set(key, {
              data,
              timestamp: timestamp + ttl,
              size
            });
            this.currentSize += size;
            
            return data;
          } else {
            // 过期，删除
            await this.cache.delete(key);
          }
        }
      } catch (error) {
        console.warn('浏览器缓存读取失败:', error);
      }
    }

    return null;
  }

  // 删除缓存
  async delete(key: string): Promise<void> {
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem) {
      this.memoryCache.delete(key);
      this.currentSize -= memoryItem.size;
    }

    if (this.cache) {
      try {
        await this.cache.delete(key);
      } catch (error) {
        console.warn('浏览器缓存删除失败:', error);
      }
    }
  }

  // LRU 淘汰策略
  private async evictLRU(): Promise<void> {
    const entries = Array.from(this.memoryCache.entries());
    entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    // 删除最旧的 25% 条目
    const toDelete = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < toDelete && i < entries.length; i++) {
      const entry = entries[i];
      if (entry) {
        const [key] = entry;
        await this.delete(key);
      }
    }
  }

  // 清空缓存
  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.currentSize = 0;

    if (this.cache) {
      try {
        const keys = await this.cache.keys();
        await Promise.all(keys.map(key => this.cache!.delete(key)));
      } catch (error) {
        console.warn('清空浏览器缓存失败:', error);
      }
    }
  }

  // 获取缓存统计
  getStats() {
    return {
      memoryEntries: this.memoryCache.size,
      memorySize: this.currentSize,
      maxSize: this.config.maxSize,
      usage: (this.currentSize / this.config.maxSize) * 100
    };
  }
}

// 性能监控器
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initObservers();
  }

  private initObservers(): void {
    if (typeof window === 'undefined') return;

    try {
      // 监控 LCP
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        this.updateMetric('LCP', lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // 监控 FID
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.updateMetric('FID', entry.processingStart - entry.startTime);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

      // 监控 CLS
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.updateMetric('CLS', clsValue);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);

    } catch (error) {
      console.warn('性能监控初始化失败:', error);
    }
  }

  private updateMetric(name: keyof PerformanceMetrics['metrics'], value: number): void {
    const currentMetric = this.getCurrentMetric();
    if (currentMetric && currentMetric.metrics) {
      (currentMetric.metrics as any)[name] = value;
    }
  }

  private getCurrentMetric(): PerformanceMetrics | null {
    if (this.metrics.length === 0) {
      this.startNewMetric();
    }
    return this.metrics[this.metrics.length - 1] || null;
  }

  // 开始新的性能测量
  startNewMetric(): void {
    if (typeof window === 'undefined') return;

    const metric: PerformanceMetrics = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metrics: {},
      resources: {
        totalSize: 0,
        totalRequests: 0,
        cacheHitRate: 0
      }
    };

    // 收集基础性能指标
    if (performance.timing) {
      const timing = performance.timing;
      metric.metrics.loadTime = timing.loadEventEnd - timing.navigationStart;
      metric.metrics.domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
      metric.metrics.firstPaint = timing.responseStart - timing.navigationStart;
      metric.metrics.TTFB = timing.responseStart - timing.requestStart;
    }

    // 收集资源信息
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    metric.resources.totalRequests = resources.length;
    metric.resources.totalSize = resources.reduce((total, resource) => {
      return total + (resource.transferSize || 0);
    }, 0);

    // 计算缓存命中率
    const cachedResources = resources.filter(resource => resource.transferSize === 0);
    metric.resources.cacheHitRate = cachedResources.length / resources.length;

    // 找到最慢的资源
    const slowestResource = resources.reduce((slowest, resource) => {
      const duration = resource.responseEnd - resource.startTime;
      if (!slowest || duration > slowest.duration) {
        return {
          name: resource.name,
          duration,
          size: resource.transferSize || 0
        };
      }
      return slowest;
    }, null as any);

    if (slowestResource) {
      metric.resources.slowestResource = slowestResource;
    }

    // 收集内存使用情况
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      metric.metrics.memoryUsage = memory.usedJSHeapSize;
    }

    // 收集连接信息
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      metric.metrics.connectionType = connection.effectiveType;
    }

    this.metrics.push(metric);
  }

  // 获取性能报告
  getPerformanceReport() {
    const recentMetrics = this.metrics.slice(-10); // 最近10次测量
    
    if (recentMetrics.length === 0) {
      return null;
    }

    const averages = {
      LCP: 0,
      FID: 0,
      CLS: 0,
      FCP: 0,
      TTFB: 0,
      loadTime: 0,
      memoryUsage: 0
    };

    let count = 0;
    recentMetrics.forEach(metric => {
      Object.keys(averages).forEach(key => {
        const value = metric.metrics[key as keyof typeof metric.metrics];
        if (typeof value === 'number') {
          averages[key as keyof typeof averages] += value;
          count++;
        }
      });
    });

    // 计算平均值
    Object.keys(averages).forEach(key => {
      averages[key as keyof typeof averages] /= Math.max(count / Object.keys(averages).length, 1);
    });

    return {
      summary: {
        totalMeasurements: this.metrics.length,
        recentMeasurements: recentMetrics.length,
        averages,
        lastMeasurement: recentMetrics[recentMetrics.length - 1]
      },
      metrics: recentMetrics,
      recommendations: this.generateRecommendations(averages)
    };
  }

  private generateRecommendations(averages: any): string[] {
    const recommendations: string[] = [];

    if (averages.LCP > 2500) {
      recommendations.push('LCP 过高，建议优化图片加载和关键资源');
    }

    if (averages.FID > 100) {
      recommendations.push('FID 过高，建议优化 JavaScript 执行时间');
    }

    if (averages.CLS > 0.1) {
      recommendations.push('CLS 过高，建议为图片和广告设置固定尺寸');
    }

    if (averages.TTFB > 600) {
      recommendations.push('TTFB 过高，建议优化服务器响应时间');
    }

    if (averages.loadTime > 3000) {
      recommendations.push('页面加载时间过长，建议启用代码分割和懒加载');
    }

    return recommendations;
  }

  // 清理观察器
  disconnect(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// 图片懒加载
export function createImageLazyLoader() {
  if (typeof window === 'undefined') return;

  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.dataset.src;
        
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      }
    });
  }, {
    rootMargin: '50px 0px',
    threshold: 0.01
  });

  // 观察所有带有 data-src 的图片
  const lazyImages = document.querySelectorAll('img[data-src]');
  lazyImages.forEach(img => imageObserver.observe(img));

  return imageObserver;
}

// 创建全局实例
export const defaultCacheManager = new CacheManager({
  name: 'app-cache',
  version: '1.0.0',
  maxAge: 24 * 60 * 60 * 1000, // 24小时
  maxSize: 50 * 1024 * 1024, // 50MB
  strategy: 'stale-while-revalidate'
});

export const performanceMonitor = new PerformanceMonitor();

// 性能优化工具函数
export const PerformanceUtils = {
  // 防抖
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  },

  // 节流
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // 空闲时执行
  runWhenIdle(callback: () => void, timeout: number = 5000): void {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(callback, { timeout });
    } else {
      setTimeout(callback, 100);
    }
  },

  // 批量 DOM 更新
  batchDOMUpdates(updates: (() => void)[]): void {
    requestAnimationFrame(() => {
      updates.forEach(update => update());
    });
  }
};
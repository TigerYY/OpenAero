import * as Sentry from '@sentry/nextjs';
import { onCLS, onFCP, onLCP, onTTFB } from 'web-vitals';

// 性能指标类型
export interface PerformanceMetrics {
  name: string;
  value: number;
  delta: number;
  id: string;
  navigationType: string;
}

// 性能监控配置
const PERFORMANCE_CONFIG = {
  // 性能阈值 (毫秒)
  thresholds: {
    CLS: 0.1,      // Cumulative Layout Shift
    FID: 100,      // First Input Delay
    FCP: 1800,     // First Contentful Paint
    LCP: 2500,     // Largest Contentful Paint
    TTFB: 600,     // Time to First Byte
  },
  
  // 采样率
  sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
};

// 性能指标处理器
function handlePerformanceMetric(metric: PerformanceMetrics) {
  const { name, value, delta, id, navigationType } = metric;
  
  // 检查是否超过阈值
  const threshold = PERFORMANCE_CONFIG.thresholds[name as keyof typeof PERFORMANCE_CONFIG.thresholds];
  const isPoor = threshold && value > threshold;
  
  // 发送到Sentry
  Sentry.addBreadcrumb({
    category: 'performance',
    message: `Performance metric: ${name}`,
    level: isPoor ? 'warning' : 'info',
    data: {
      name,
      value,
      delta,
      id,
      navigationType,
      threshold,
      isPoor,
    },
  });
  
  // 如果性能较差，发送事件
  if (isPoor) {
    Sentry.captureMessage(`Poor performance detected: ${name}`, 'warning');
  }
  
  // 发送到分析服务
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', name, {
      event_category: 'Performance',
      event_label: id,
      value: Math.round(value),
      custom_map: {
        metric_name: name,
        metric_value: value,
        metric_delta: delta,
      },
    });
  }
  
  // 开发环境日志
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${name}:`, {
      value: `${value.toFixed(2)}ms`,
      delta: `${delta.toFixed(2)}ms`,
      threshold: threshold ? `${threshold}ms` : 'N/A',
      status: isPoor ? '⚠️ Poor' : '✅ Good',
    });
  }
}

// 初始化性能监控
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return;
  
  // 监控各种性能指标
  onCLS(handlePerformanceMetric);
  onFCP(handlePerformanceMetric);
  onLCP(handlePerformanceMetric);
  onTTFB(handlePerformanceMetric);
  
  // 监控页面可见性变化
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      Sentry.addBreadcrumb({
        category: 'navigation',
        message: 'Page became visible',
        level: 'info',
      });
    }
  });
  
  // 监控页面卸载
  window.addEventListener('beforeunload', () => {
    Sentry.addBreadcrumb({
      category: 'navigation',
      message: 'Page unloading',
      level: 'info',
    });
  });
}

// 错误监控工具
export class ErrorMonitor {
  static captureError(error: Error, context?: Record<string, any>) {
    Sentry.captureException(error, {
      tags: {
        component: context?.component || 'unknown',
        action: context?.action || 'unknown',
      },
      extra: context || {},
    });
  }
  
  static captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
    Sentry.captureMessage(message, {
      level,
      extra: context || {},
    });
  }
  
  static setUser(user: { id: string; email?: string; name?: string }) {
    Sentry.setUser(user);
  }
  
  static clearUser() {
    Sentry.setUser(null);
  }
  
  static addBreadcrumb(message: string, category: string, level: 'info' | 'warning' | 'error' = 'info', data?: Record<string, any>) {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data: data || {},
    });
  }
}

// API监控工具
export class APIMonitor {
  static async trackAPICall<T>(
    apiCall: () => Promise<T>,
    endpoint: string,
    method: string = 'GET'
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;
      
      // 记录成功的API调用
      Sentry.addBreadcrumb({
        category: 'api',
        message: `API call successful: ${method} ${endpoint}`,
        level: 'info',
        data: {
          endpoint,
          method,
          duration: Math.round(duration),
          status: 'success',
        },
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      // 记录失败的API调用
      Sentry.addBreadcrumb({
        category: 'api',
        message: `API call failed: ${method} ${endpoint}`,
        level: 'error',
        data: {
          endpoint,
          method,
          duration: Math.round(duration),
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      
      // 捕获API错误
      Sentry.captureException(error, {
        tags: {
          component: 'api',
          endpoint,
          method,
        },
        extra: {
          duration: Math.round(duration),
        },
      });
      
      throw error;
    }
  }
}

// 业务指标监控
export class BusinessMetrics {
  static trackSolutionView(solutionId: string, solutionTitle: string) {
    Sentry.addBreadcrumb({
      category: 'business',
      message: 'Solution viewed',
      level: 'info',
      data: {
        solutionId,
        solutionTitle,
        action: 'view',
      },
    });
    
    // 发送到分析服务
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'solution_view', {
        event_category: 'Business',
        event_label: solutionTitle,
        custom_map: {
          solution_id: solutionId,
          solution_title: solutionTitle,
        },
      });
    }
  }
  
  static trackCreatorApplication(creatorId: string, status: 'started' | 'completed' | 'failed') {
    Sentry.addBreadcrumb({
      category: 'business',
      message: 'Creator application',
      level: 'info',
      data: {
        creatorId,
        status,
        action: 'creator_application',
      },
    });
    
    // 发送到分析服务
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'creator_application', {
        event_category: 'Business',
        event_label: status,
        custom_map: {
          creator_id: creatorId,
          status,
        },
      });
    }
  }
  
  static trackSearch(query: string, resultsCount: number, filters?: Record<string, any>) {
    Sentry.addBreadcrumb({
      category: 'business',
      message: 'Search performed',
      level: 'info',
      data: {
        query,
        resultsCount,
        filters,
        action: 'search',
      },
    });
    
    // 发送到分析服务
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'search', {
        event_category: 'Business',
        event_label: query,
        value: resultsCount,
        custom_map: {
          query,
          results_count: resultsCount,
          filters: JSON.stringify(filters || {}),
        },
      });
    }
  }
}

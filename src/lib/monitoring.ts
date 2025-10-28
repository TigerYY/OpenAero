// import * as Sentry from '@sentry/nextjs';
import { onCLS, onFCP, onLCP, onTTFB } from 'web-vitals';

export interface PerformanceMetrics {
  name: string;
  value: number;
  delta: number;
  id: string;
  navigationType: string;
}

// 性能监控配置
const PERFORMANCE_CONFIG = {
  // 性能阈值（毫秒）
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

// 处理性能指标
function handlePerformanceMetric(metric: PerformanceMetrics) {
  const { name, value, delta, id, navigationType } = metric;
  
  // 检查是否超过阈值
  const threshold = PERFORMANCE_CONFIG.thresholds[name as keyof typeof PERFORMANCE_CONFIG.thresholds];
  const isPoor = threshold && value > threshold;
  
  // 如果性能较差，记录警告
  if (isPoor) {
    console.warn(`Poor performance detected: ${name}`, { value, threshold });
  }

  // 发送到分析服务
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', name, {
      event_category: 'Performance',
      event_label: navigationType,
      value: Math.round(value),
      custom_map: {
        metric_id: id,
        metric_delta: delta,
        metric_threshold: threshold,
        metric_is_poor: isPoor,
      },
    });
  }

  // 发送到自定义分析端点
  if (typeof window !== 'undefined' && Math.random() < PERFORMANCE_CONFIG.sampleRate) {
    fetch('/api/analytics/performance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        value,
        delta,
        id,
        navigationType,
        threshold,
        isPoor,
        timestamp: Date.now(),
      }),
    }).catch(error => {
      console.error('Failed to send performance metric:', error);
    });
  }
}

// 质量指标类型
export type QualityMetricType = 'coverage' | 'performance' | 'security' | 'accessibility' | 'bundle-size';

export interface QualityMetric {
  type: QualityMetricType;
  score: number;
  threshold: number;
  passed: boolean;
  timestamp: number;
  details?: Record<string, unknown>;
}

// 质量监控器
export class QualityMonitor {
  private static metrics: QualityMetric[] = [];

  static recordQualityMetric(metric: QualityMetric) {
    this.metrics.push(metric);
    
    // 限制内存使用，只保留最近的200条记录
    if (this.metrics.length > 200) {
      this.metrics = this.metrics.slice(-200);
    }

    // 发送到监控服务
    this.sendToMonitoringService(metric);

    // 如果质量指标未通过阈值，记录警告
    if (!metric.passed && process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn(`Quality metric failed: ${metric.type}`, metric);
    }
  }

  static getQualityMetrics(): QualityMetric[] {
    return [...this.metrics];
  }

  static getQualityDashboard() {
    const metrics = this.getQualityMetrics();
    const dashboard = {
      overall: {
        score: 0,
        passed: 0,
        total: metrics.length,
        passRate: 0,
      },
      byType: {} as Record<QualityMetricType, {
        score: number;
        passed: number;
        total: number;
        passRate: number;
        latestScore: number;
      }>,
    };

    if (metrics.length === 0) {
      return dashboard;
    }

    // 计算总体指标
    const totalScore = metrics.reduce((sum, m) => sum + m.score, 0);
    const passedCount = metrics.filter(m => m.passed).length;
    
    dashboard.overall.score = Math.round(totalScore / metrics.length);
    dashboard.overall.passed = passedCount;
    dashboard.overall.passRate = Math.round((passedCount / metrics.length) * 100);

    // 按类型分组统计
    const typeGroups = metrics.reduce((groups, metric) => {
      if (!groups[metric.type]) {
        groups[metric.type] = [];
      }
      groups[metric.type].push(metric);
      return groups;
    }, {} as Record<QualityMetricType, QualityMetric[]>);

    Object.entries(typeGroups).forEach(([type, typeMetrics]) => {
      const typeScore = typeMetrics.reduce((sum, m) => sum + m.score, 0);
      const typePassed = typeMetrics.filter(m => m.passed).length;
      const latestMetric = typeMetrics[typeMetrics.length - 1];
      
      if (latestMetric) {
        dashboard.byType[type as QualityMetricType] = {
          score: Math.round(typeScore / typeMetrics.length),
          passed: typePassed,
          total: typeMetrics.length,
          passRate: Math.round((typePassed / typeMetrics.length) * 100),
          latestScore: latestMetric.score,
        };
      }
    });

    return dashboard;
  }

  private static async sendToMonitoringService(metric: QualityMetric) {
    if (process.env.NODE_ENV === 'production' && process.env.MONITORING_ENDPOINT) {
      try {
        await fetch(process.env.MONITORING_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metric),
        });
      } catch (error) {
        // 静默失败，避免影响主要功能
      }
    }
  }

  // 记录测试覆盖率
  static recordTestCoverage(coverage: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  }) {
    const averageCoverage = (coverage.lines + coverage.functions + coverage.branches + coverage.statements) / 4;
    this.recordQualityMetric({
      type: 'coverage',
      score: Math.round(averageCoverage),
      threshold: 80,
      passed: averageCoverage >= 80,
      timestamp: Date.now(),
      details: coverage,
    });
  }

  // 记录性能评分
  static recordPerformanceScore(score: number, details?: Record<string, unknown>) {
    this.recordQualityMetric({
      type: 'performance',
      score,
      threshold: 90,
      passed: score >= 90,
      timestamp: Date.now(),
      details,
    });
  }

  // 记录安全审计结果
  static recordSecurityAudit(vulnerabilities: number, details?: Record<string, unknown>) {
    const score = Math.max(0, 100 - vulnerabilities * 10);
    this.recordQualityMetric({
      type: 'security',
      score,
      threshold: 95,
      passed: vulnerabilities === 0,
      timestamp: Date.now(),
      details: { vulnerabilities, ...details },
    });
  }

  // 记录可访问性评分
  static recordAccessibilityScore(score: number, details?: Record<string, unknown>) {
    this.recordQualityMetric({
      type: 'accessibility',
      score,
      threshold: 95,
      passed: score >= 95,
      timestamp: Date.now(),
      details,
    });
  }

  // 记录打包大小
  static recordBundleSize(sizeKB: number, threshold: number = 500) {
    const score = Math.max(0, Math.round(100 - (sizeKB / threshold) * 100));
    this.recordQualityMetric({
      type: 'bundle-size',
      score,
      threshold: 80,
      passed: sizeKB <= threshold,
      timestamp: Date.now(),
      details: { sizeKB, threshold },
    });
  }
}

// 初始化性能监控
export function initPerformanceMonitoring() {
  if (typeof window !== 'undefined') {
    // 监控核心 Web Vitals
    onCLS(handlePerformanceMetric);
    onFCP(handlePerformanceMetric);
    onLCP(handlePerformanceMetric);
    onTTFB(handlePerformanceMetric);

    // 监控 FID（需要用户交互）
     import('web-vitals').then((webVitals) => {
       if ('onFID' in webVitals) {
         (webVitals as any).onFID(handlePerformanceMetric);
       }
     });

    // 监控自定义性能指标
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            handlePerformanceMetric({
              name: 'DOM_CONTENT_LOADED',
              value: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              delta: 0,
              id: `nav-${Date.now()}`,
              navigationType: navEntry.type,
            });
          }
        });
      });
      observer.observe({ entryTypes: ['navigation'] });
    }
  }
}

// 错误监控器
export class ErrorMonitor {
  static captureError(error: Error, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error captured:', error, context);
    }

    // 发送错误到监控服务
    if (typeof window !== 'undefined') {
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          context,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      }).catch(() => {
        // 静默失败，避免影响主要功能
      });
    }
  }

  static captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'development') {
      const logMethod = level === 'warning' ? 'warn' : level === 'error' ? 'error' : 'log';
      // eslint-disable-next-line no-console
      console[logMethod]('Message captured:', message, context);
    }
  }

  static setUser(user: { id: string; email?: string; name?: string }) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('User set:', user);
    }
    // 可以存储到 localStorage 或发送到分析服务
    if (typeof window !== 'undefined') {
      localStorage.setItem('monitoring_user', JSON.stringify(user));
    }
  }

  static clearUser() {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('User cleared');
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('monitoring_user');
    }
  }

  static addBreadcrumb(message: string, category: string, level: 'info' | 'warning' | 'error' = 'info', data?: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('Breadcrumb added:', { message, category, level, data });
    }
  }
}

// API 监控器
export class APIMonitor {
  static async trackAPICall<T>(
    apiCall: () => Promise<T>,
    endpoint: string,
    method: string = 'GET'
  ): Promise<T> {
    const startTime = Date.now();
    let success = false;
    let error: Error | null = null;

    try {
      const result = await apiCall();
      success = true;
      return result;
    } catch (err) {
      error = err as Error;
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      
      // 记录 API 调用指标
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('API call tracked:', {
          endpoint,
          method,
          duration,
          success,
          error: error?.message,
        });
      }

      // 发送到监控服务
      if (typeof window !== 'undefined') {
        fetch('/api/monitoring/api-calls', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint,
            method,
            duration,
            success,
            error: error?.message,
            timestamp: Date.now(),
          }),
        }).catch(() => {
          // 静默失败，避免影响主要功能
        });
      }

      // 如果 API 调用时间过长，记录警告
      if (duration > 5000 && process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn(`Slow API call detected: ${endpoint} took ${duration}ms`);
      }

      // 如果 API 调用失败，记录错误
      if (error) {
        ErrorMonitor.captureError(error, {
          component: 'APIMonitor',
          endpoint,
          method,
          duration,
        });
      }
    }
  }
}

// 业务指标监控器
export class BusinessMetrics {
  static trackSolutionView(solutionId: string, solutionTitle: string) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('Solution view tracked:', { solutionId, solutionTitle });
    }

    if (typeof window !== 'undefined') {
      // 发送到 Google Analytics
      if ((window as any).gtag) {
        (window as any).gtag('event', 'solution_view', {
          event_category: 'Solutions',
          event_label: solutionTitle,
          custom_map: {
            solution_id: solutionId,
          },
        });
      }

      // 发送到自定义分析服务
      fetch('/api/analytics/business-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'solution_view',
          solutionId,
          solutionTitle,
          timestamp: Date.now(),
        }),
      }).catch(() => {
        // 静默失败，避免影响主要功能
      });
    }
  }

  static trackCreatorApplication(creatorId: string, status: 'started' | 'completed' | 'failed') {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('Creator application tracked:', { creatorId, status });
    }

    if (typeof window !== 'undefined') {
      // 发送到 Google Analytics
      if ((window as any).gtag) {
        (window as any).gtag('event', 'creator_application', {
          event_category: 'Creators',
          event_label: status,
          custom_map: {
            creator_id: creatorId,
          },
        });
      }

      // 发送到自定义分析服务
      fetch('/api/analytics/business-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'creator_application',
          creatorId,
          status,
          timestamp: Date.now(),
        }),
      }).catch(() => {
        // 静默失败，避免影响主要功能
      });
    }
  }

  static trackSearch(query: string, resultsCount: number, filters?: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('Search tracked:', { query, resultsCount, filters });
    }

    if (typeof window !== 'undefined') {
      // 发送到 Google Analytics
      if ((window as any).gtag) {
        (window as any).gtag('event', 'search', {
          event_category: 'Search',
          event_label: query,
          value: resultsCount,
          custom_map: {
            results_count: resultsCount,
            filters: JSON.stringify(filters || {}),
          },
        });
      }

      // 发送到自定义分析服务
      fetch('/api/analytics/business-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'search',
          query,
          resultsCount,
          filters,
          timestamp: Date.now(),
        }),
      }).catch(() => {
        // 静默失败，避免影响主要功能
      });
    }
  }
}

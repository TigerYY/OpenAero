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
  details?: Record<string, any>;
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
    if (!metric.passed) {
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
        failed: 0,
      },
      byType: {} as Record<QualityMetricType, {
        latest: QualityMetric | null;
        average: number;
        trend: 'up' | 'down' | 'stable';
      }>,
    };

    if (metrics.length === 0) {
      return dashboard;
    }

    // 计算总体指标
    dashboard.overall.passed = metrics.filter(m => m.passed).length;
    dashboard.overall.failed = metrics.length - dashboard.overall.passed;
    dashboard.overall.score = Math.round((dashboard.overall.passed / metrics.length) * 100);

    // 按类型分组
    const typeGroups = metrics.reduce((groups, metric) => {
      if (!groups[metric.type]) {
        groups[metric.type] = [];
      }
      groups[metric.type].push(metric);
      return groups;
    }, {} as Record<QualityMetricType, QualityMetric[]>);

    // 计算每种类型的指标
     Object.entries(typeGroups).forEach(([type, typeMetrics]) => {
       const sortedMetrics = typeMetrics.sort((a, b) => b.timestamp - a.timestamp);
       const latest = sortedMetrics[0] || null;
       const average = typeMetrics.reduce((sum, m) => sum + m.score, 0) / typeMetrics.length;
      
      // 计算趋势（比较最近5个指标）
      const recent = sortedMetrics.slice(0, 5);
      const older = sortedMetrics.slice(5, 10);
      let trend: 'up' | 'down' | 'stable' = 'stable';
      
      if (recent.length >= 3 && older.length >= 3) {
        const recentAvg = recent.reduce((sum, m) => sum + m.score, 0) / recent.length;
        const olderAvg = older.reduce((sum, m) => sum + m.score, 0) / older.length;
        const diff = recentAvg - olderAvg;
        
        if (diff > 5) trend = 'up';
        else if (diff < -5) trend = 'down';
      }

      dashboard.byType[type as QualityMetricType] = {
        latest,
        average: Math.round(average),
        trend,
      };
    });

    return dashboard;
  }

  private static async sendToMonitoringService(metric: QualityMetric) {
    try {
      if (typeof window !== 'undefined') {
        await fetch('/api/monitoring/quality', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metric),
        });
      }
    } catch (error) {
      console.error('Failed to send quality metric to monitoring service:', error);
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
      score: averageCoverage,
      threshold: 80,
      passed: averageCoverage >= 80,
      timestamp: Date.now(),
      details: coverage,
    });
  }

  // 记录性能分数
  static recordPerformanceScore(score: number, details?: Record<string, any>) {
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
  static recordSecurityAudit(vulnerabilities: number, details?: Record<string, any>) {
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

  // 记录可访问性分数
  static recordAccessibilityScore(score: number, details?: Record<string, any>) {
    this.recordQualityMetric({
      type: 'accessibility',
      score,
      threshold: 95,
      passed: score >= 95,
      timestamp: Date.now(),
      details,
    });
  }

  // 记录包大小
  static recordBundleSize(sizeKB: number, threshold: number = 500) {
    const score = Math.max(0, 100 - Math.max(0, sizeKB - threshold) / 10);
    this.recordQualityMetric({
      type: 'bundle-size',
      score: Math.round(score),
      threshold,
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
  static captureError(error: Error, context?: Record<string, any>) {
    console.error('Error captured:', error, context);
    
    // 发送到自定义错误收集服务
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
      }).catch(err => {
        console.error('Failed to send error to monitoring service:', err);
      });
    }
  }

  static captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
    const logMethod = level === 'warning' ? 'warn' : level === 'error' ? 'error' : 'log';
    console[logMethod]('Message captured:', message, context);
  }

  static setUser(user: { id: string; email?: string; name?: string }) {
    console.log('User set:', user);
    // 可以存储到 localStorage 或发送到分析服务
    if (typeof window !== 'undefined') {
      localStorage.setItem('monitoring_user', JSON.stringify(user));
    }
  }

  static clearUser() {
    console.log('User cleared');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('monitoring_user');
    }
  }

  static addBreadcrumb(message: string, category: string, level: 'info' | 'warning' | 'error' = 'info', data?: Record<string, any>) {
    console.log('Breadcrumb added:', { message, category, level, data });
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
      console.log('API call tracked:', {
        endpoint,
        method,
        duration,
        success,
        error: error?.message,
      });

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
        }).catch(err => {
          console.error('Failed to send API monitoring data:', err);
        });
      }

      // 如果 API 调用时间过长，记录警告
      if (duration > 5000) {
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
    console.log('Solution view tracked:', { solutionId, solutionTitle });

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
      }).catch(error => {
        console.error('Failed to send business metric:', error);
      });
    }
  }

  static trackCreatorApplication(creatorId: string, status: 'started' | 'completed' | 'failed') {
    console.log('Creator application tracked:', { creatorId, status });

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
      }).catch(error => {
        console.error('Failed to send business metric:', error);
      });
    }
  }

  static trackSearch(query: string, resultsCount: number, filters?: Record<string, any>) {
    console.log('Search tracked:', { query, resultsCount, filters });

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
      }).catch(error => {
        console.error('Failed to send business metric:', error);
      });
    }
  }
}

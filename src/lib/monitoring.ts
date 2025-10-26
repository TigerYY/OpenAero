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

// 质量监控类
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
      Sentry.addBreadcrumb({
        category: 'quality',
        message: `Quality metric failed: ${metric.type}`,
        level: 'warning',
        data: metric,
      });
    }
  }

  static getQualityMetrics(): QualityMetric[] {
    return [...this.metrics];
  }

  static getQualityDashboard() {
    const recent = this.metrics.filter(
      m => Date.now() - m.timestamp < 86400000 // 最近24小时
    );

    const dashboard = {
      overall: {
        total: recent.length,
        passed: recent.filter(m => m.passed).length,
        failed: recent.filter(m => !m.passed).length,
        passRate: recent.length > 0 ? (recent.filter(m => m.passed).length / recent.length) * 100 : 0
      },
      byType: {} as Record<string, any>
    };

    // 按类型分组统计
    const groupedByType = recent.reduce((acc, metric) => {
      if (!acc[metric.type]) {
        acc[metric.type] = [];
      }
      acc[metric.type]!.push(metric);
      return acc;
    }, {} as Record<string, QualityMetric[]>);

    Object.entries(groupedByType).forEach(([type, metrics]) => {
      const scores = metrics.map(m => m.score);
      dashboard.byType[type] = {
        count: metrics.length,
        passed: metrics.filter(m => m.passed).length,
        failed: metrics.filter(m => !m.passed).length,
        passRate: (metrics.filter(m => m.passed).length / metrics.length) * 100,
        avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
        minScore: Math.min(...scores),
        maxScore: Math.max(...scores),
        latestScore: metrics.length > 0 ? metrics[metrics.length - 1]!.score : 0
      };
    });

    return dashboard;
  }

  private static async sendToMonitoringService(metric: QualityMetric) {
    try {
      if (process.env.NODE_ENV === 'production') {
        await fetch('/api/monitoring/quality', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metric),
        });
      }
    } catch (error) {
      console.warn('Failed to send quality metric to service:', error);
    }
  }

  // 记录测试覆盖率
  static recordTestCoverage(coverage: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  }) {
    const avgCoverage = (coverage.lines + coverage.functions + coverage.branches + coverage.statements) / 4;
    
    this.recordQualityMetric({
      type: 'coverage',
      score: avgCoverage,
      threshold: 85,
      passed: avgCoverage >= 85,
      timestamp: Date.now(),
      details: coverage
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
      details
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
      details: { vulnerabilities, ...details }
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
      details
    });
  }

  // 记录包大小
  static recordBundleSize(sizeKB: number, threshold: number = 500) {
    const score = Math.max(0, 100 - Math.max(0, sizeKB - threshold) / 10);
    
    this.recordQualityMetric({
      type: 'bundle-size',
      score,
      threshold: 90,
      passed: sizeKB <= threshold,
      timestamp: Date.now(),
      details: { sizeKB, thresholdKB: threshold }
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

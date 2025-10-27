import { NextRequest, NextResponse } from 'next/server';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

// 启用默认指标收集
collectDefaultMetrics();

// 自定义指标
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

const databaseConnections = new Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections'
});

const cacheHitRate = new Gauge({
  name: 'cache_hit_rate',
  help: 'Cache hit rate percentage'
});

const userSessions = new Gauge({
  name: 'user_sessions_active',
  help: 'Number of active user sessions'
});

const errorRate = new Counter({
  name: 'application_errors_total',
  help: 'Total number of application errors',
  labelNames: ['type', 'severity']
});

// 业务指标
const userRegistrations = new Counter({
  name: 'user_registrations_total',
  help: 'Total number of user registrations'
});

const userLogins = new Counter({
  name: 'user_logins_total',
  help: 'Total number of user logins',
  labelNames: ['method']
});

const apiCalls = new Counter({
  name: 'api_calls_total',
  help: 'Total number of API calls',
  labelNames: ['endpoint', 'method', 'status']
});

const responseTime = new Histogram({
  name: 'api_response_time_seconds',
  help: 'API response time in seconds',
  labelNames: ['endpoint', 'method'],
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5]
});

// 导出指标收集器
export const metricsCollector = {
  httpRequestsTotal,
  httpRequestDuration,
  activeConnections,
  databaseConnections,
  cacheHitRate,
  userSessions,
  errorRate,
  userRegistrations,
  userLogins,
  apiCalls,
  responseTime
};

export async function GET(request: NextRequest) {
  try {
    // 更新实时指标
    updateRealTimeMetrics();

    // 获取所有指标
    const metrics = await register.metrics();
    
    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': register.contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error generating metrics:', error);
    return NextResponse.json(
      { error: 'Failed to generate metrics' },
      { status: 500 }
    );
  }
}

function updateRealTimeMetrics() {
  try {
    // 模拟实时指标更新
    // 在实际应用中，这些值应该从实际的数据源获取
    
    // 活跃连接数
    activeConnections.set(Math.floor(Math.random() * 100) + 50);
    
    // 数据库连接数
    databaseConnections.set(Math.floor(Math.random() * 20) + 5);
    
    // 缓存命中率
    cacheHitRate.set(Math.random() * 0.3 + 0.7); // 70-100%
    
    // 活跃用户会话
    userSessions.set(Math.floor(Math.random() * 500) + 100);
    
  } catch (error) {
    console.error('Error updating real-time metrics:', error);
    errorRate.inc({ type: 'metrics_update', severity: 'error' });
  }
}

// 中间件函数，用于记录 HTTP 请求指标
export function recordHttpMetrics(
  method: string,
  route: string,
  statusCode: number,
  duration: number
) {
  httpRequestsTotal.inc({ method, route, status_code: statusCode.toString() });
  httpRequestDuration.observe({ method, route }, duration / 1000);
}

// 记录 API 调用指标
export function recordApiCall(
  endpoint: string,
  method: string,
  status: number,
  responseTimeMs: number
) {
  apiCalls.inc({ endpoint, method, status: status.toString() });
  responseTime.observe({ endpoint, method }, responseTimeMs / 1000);
}

// 记录错误指标
export function recordError(type: string, severity: 'low' | 'medium' | 'high' | 'critical') {
  errorRate.inc({ type, severity });
}

// 记录用户活动指标
export function recordUserActivity(activity: 'registration' | 'login', method?: string) {
  switch (activity) {
    case 'registration':
      userRegistrations.inc();
      break;
    case 'login':
      userLogins.inc({ method: method || 'unknown' });
      break;
  }
}
# OpenAero 监控与运维体系设计

## 文档版本: 1.0
创建日期: 2025年1月27日
状态: 供团队评审

---

## 1. 监控体系概述

### 1.1 监控目标
- **系统可用性**: 确保服务99.9%以上的可用性
- **性能监控**: 实时监控系统性能指标
- **错误追踪**: 快速发现和定位问题
- **业务指标**: 监控关键业务指标
- **用户体验**: 监控用户行为和体验

### 1.2 监控层次
```
┌─────────────────────────────────────────┐
│              用户体验层                  │
│  Real User Monitoring (RUM)            │
├─────────────────────────────────────────┤
│              应用性能层                  │
│  Application Performance Monitoring     │
├─────────────────────────────────────────┤
│              基础设施层                  │
│  Infrastructure Monitoring             │
├─────────────────────────────────────────┤
│              日志分析层                  │
│  Log Analysis & Management             │
└─────────────────────────────────────────┘
```

## 2. 监控工具选型

### 2.1 监控工具栈
```typescript
// 监控工具配置
interface MonitoringStack {
  // 应用性能监控
  apm: {
    primary: 'Sentry'           // 错误监控和性能分析
    secondary: 'DataDog'        // 全栈监控
    backup: 'New Relic'         // 备用方案
  }
  
  // 基础设施监控
  infrastructure: {
    primary: 'DataDog'          // 服务器和容器监控
    secondary: 'Prometheus'     // 指标收集
    backup: 'Grafana'           // 可视化
  }
  
  // 日志管理
  logging: {
    primary: 'ELK Stack'        // Elasticsearch + Logstash + Kibana
    secondary: 'Fluentd'        // 日志收集
    backup: 'Splunk'            // 企业级日志分析
  }
  
  // 用户体验监控
  rum: {
    primary: 'Google Analytics 4'  // 用户行为分析
    secondary: 'Hotjar'            // 用户会话录制
    backup: 'LogRocket'            // 前端错误监控
  }
  
  // 告警通知
  alerting: {
    primary: 'PagerDuty'        // 告警管理
    secondary: 'Slack'          // 团队通知
    backup: 'Email'             // 邮件通知
  }
}
```

### 2.2 监控指标分类

#### 2.2.1 业务指标
```typescript
interface BusinessMetrics {
  // 用户指标
  userMetrics: {
    totalUsers: number
    activeUsers: number
    newUserRegistrations: number
    userRetentionRate: number
    userChurnRate: number
  }
  
  // 产品指标
  productMetrics: {
    totalProducts: number
    productViews: number
    productConversions: number
    productCertificationRate: number
    averageProductRating: number
  }
  
  // 创作者指标
  creatorMetrics: {
    totalCreators: number
    activeCreators: number
    newCreatorRegistrations: number
    creatorSubmissionRate: number
    creatorApprovalRate: number
    creatorRevenue: number
  }
  
  // 订单指标
  orderMetrics: {
    totalOrders: number
    orderValue: number
    orderCompletionRate: number
    orderCancellationRate: number
    averageOrderValue: number
  }
  
  // 收益指标
  revenueMetrics: {
    totalRevenue: number
    monthlyRecurringRevenue: number
    revenueGrowthRate: number
    profitMargin: number
    costPerAcquisition: number
  }
}
```

#### 2.2.2 技术指标
```typescript
interface TechnicalMetrics {
  // 性能指标
  performance: {
    responseTime: number        // 响应时间 (ms)
    throughput: number          // 吞吐量 (req/s)
    errorRate: number           // 错误率 (%)
    availability: number        // 可用性 (%)
    uptime: number             // 运行时间
  }
  
  // 资源指标
  resources: {
    cpuUsage: number           // CPU使用率 (%)
    memoryUsage: number        // 内存使用率 (%)
    diskUsage: number          // 磁盘使用率 (%)
    networkUsage: number       // 网络使用率 (%)
    databaseConnections: number // 数据库连接数
  }
  
  // 数据库指标
  database: {
    queryPerformance: number   // 查询性能 (ms)
    connectionPool: number     // 连接池使用率 (%)
    cacheHitRate: number       // 缓存命中率 (%)
    slowQueries: number        // 慢查询数量
    deadlocks: number          // 死锁数量
  }
  
  // 缓存指标
  cache: {
    hitRate: number            // 缓存命中率 (%)
    missRate: number           // 缓存未命中率 (%)
    evictionRate: number       // 缓存淘汰率 (%)
    memoryUsage: number        // 缓存内存使用量
  }
}
```

## 3. 监控实现

### 3.1 应用性能监控 (APM)

#### 3.1.1 Sentry集成
```typescript
// lib/monitoring/sentry.ts
import * as Sentry from '@sentry/nextjs'

// Sentry配置
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  beforeSend(event) {
    // 过滤敏感信息
    if (event.request?.cookies) {
      delete event.request.cookies
    }
    return event
  }
})

// 性能监控装饰器
export function withPerformanceMonitoring<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operationName: string
) {
  return async (...args: T): Promise<R> => {
    const transaction = Sentry.startTransaction({
      name: operationName,
      op: 'function'
    })
    
    try {
      const result = await fn(...args)
      transaction.setStatus('ok')
      return result
    } catch (error) {
      transaction.setStatus('internal_error')
      Sentry.captureException(error)
      throw error
    } finally {
      transaction.finish()
    }
  }
}

// 用户行为追踪
export function trackUserAction(action: string, properties?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message: action,
    category: 'user-action',
    data: properties,
    level: 'info'
  })
}

// 自定义指标
export function recordCustomMetric(name: string, value: number, tags?: Record<string, string>) {
  Sentry.metrics.increment(name, value, tags)
}
```

#### 3.1.2 性能监控中间件
```typescript
// middleware/performance.ts
import { NextRequest, NextResponse } from 'next/server'
import { withPerformanceMonitoring } from '@/lib/monitoring/sentry'

export function performanceMiddleware(handler: Function) {
  return withPerformanceMonitoring(
    async (request: NextRequest) => {
      const start = Date.now()
      
      // 执行原始处理器
      const response = await handler(request)
      
      // 记录性能指标
      const duration = Date.now() - start
      recordCustomMetric('api.response_time', duration, {
        endpoint: request.nextUrl.pathname,
        method: request.method
      })
      
      // 添加性能头
      response.headers.set('X-Response-Time', `${duration}ms`)
      
      return response
    },
    `API-${request.method}-${request.nextUrl.pathname}`
  )
}
```

### 3.2 基础设施监控

#### 3.2.1 Prometheus指标收集
```typescript
// lib/monitoring/prometheus.ts
import { register, Counter, Histogram, Gauge } from 'prom-client'

// 自定义指标
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
})

const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
})

const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
})

const databaseQueryDuration = new Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type', 'table']
})

// 注册指标
register.registerMetric(httpRequestDuration)
register.registerMetric(httpRequestTotal)
register.registerMetric(activeConnections)
register.registerMetric(databaseQueryDuration)

// 指标收集函数
export function recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
  httpRequestDuration
    .labels(method, route, statusCode.toString())
    .observe(duration / 1000)
  
  httpRequestTotal
    .labels(method, route, statusCode.toString())
    .inc()
}

export function recordDatabaseQuery(queryType: string, table: string, duration: number) {
  databaseQueryDuration
    .labels(queryType, table)
    .observe(duration / 1000)
}

export function updateActiveConnections(count: number) {
  activeConnections.set(count)
}

// 获取指标数据
export async function getMetrics() {
  return await register.metrics()
}
```

#### 3.2.2 健康检查端点
```typescript
// app/api/health/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getMetrics } from '@/lib/monitoring/prometheus'

export async function GET(request: NextRequest) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV,
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      external_apis: await checkExternalAPIs()
    },
    metrics: await getMetrics()
  }

  const isHealthy = Object.values(health.checks).every(check => check.status === 'healthy')
  
  return NextResponse.json(health, {
    status: isHealthy ? 200 : 503
  })
}

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'healthy', responseTime: Date.now() }
  } catch (error) {
    return { status: 'unhealthy', error: error.message }
  }
}

async function checkRedis() {
  try {
    // Redis健康检查逻辑
    return { status: 'healthy', responseTime: Date.now() }
  } catch (error) {
    return { status: 'unhealthy', error: error.message }
  }
}

async function checkExternalAPIs() {
  try {
    // 外部API健康检查逻辑
    return { status: 'healthy', responseTime: Date.now() }
  } catch (error) {
    return { status: 'unhealthy', error: error.message }
  }
}
```

### 3.3 日志管理

#### 3.3.1 结构化日志
```typescript
// lib/monitoring/logger.ts
import winston from 'winston'
import { v4 as uuidv4 } from 'uuid'

// 日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      traceId: meta.traceId,
      userId: meta.userId,
      service: 'openaero-web',
      ...meta
    })
  })
)

// 创建Logger实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
})

// 日志上下文
interface LogContext {
  traceId?: string
  userId?: string
  requestId?: string
  service?: string
  operation?: string
  [key: string]: any
}

// 日志记录函数
export class Logger {
  private context: LogContext = {}

  constructor(context: LogContext = {}) {
    this.context = {
      traceId: uuidv4(),
      service: 'openaero-web',
      ...context
    }
  }

  info(message: string, meta?: Record<string, any>) {
    logger.info(message, { ...this.context, ...meta })
  }

  error(message: string, error?: Error, meta?: Record<string, any>) {
    logger.error(message, {
      ...this.context,
      ...meta,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    })
  }

  warn(message: string, meta?: Record<string, any>) {
    logger.warn(message, { ...this.context, ...meta })
  }

  debug(message: string, meta?: Record<string, any>) {
    logger.debug(message, { ...this.context, ...meta })
  }

  // 业务日志
  business(event: string, data: Record<string, any>) {
    this.info(`Business Event: ${event}`, { event, ...data })
  }

  // 性能日志
  performance(operation: string, duration: number, meta?: Record<string, any>) {
    this.info(`Performance: ${operation}`, {
      operation,
      duration,
      ...meta
    })
  }

  // 安全日志
  security(event: string, data: Record<string, any>) {
    this.warn(`Security Event: ${event}`, { event, ...data })
  }
}

// 默认Logger实例
export const defaultLogger = new Logger()
```

#### 3.3.2 日志中间件
```typescript
// middleware/logging.ts
import { NextRequest, NextResponse } from 'next/server'
import { Logger } from '@/lib/monitoring/logger'

export function loggingMiddleware(handler: Function) {
  return async (request: NextRequest) => {
    const logger = new Logger({
      requestId: request.headers.get('x-request-id') || uuidv4(),
      operation: `${request.method} ${request.nextUrl.pathname}`
    })

    const start = Date.now()
    
    try {
      logger.info('Request started', {
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.ip
      })

      const response = await handler(request)
      
      const duration = Date.now() - start
      logger.performance('Request completed', duration, {
        statusCode: response.status,
        method: request.method,
        url: request.url
      })

      return response
    } catch (error) {
      const duration = Date.now() - start
      logger.error('Request failed', error as Error, {
        method: request.method,
        url: request.url,
        duration
      })
      throw error
    }
  }
}
```

### 3.4 用户体验监控

#### 3.4.1 用户行为追踪
```typescript
// lib/monitoring/analytics.ts
import { Analytics } from '@vercel/analytics/react'

// 用户行为事件
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (typeof window !== 'undefined') {
    // Google Analytics 4
    gtag('event', eventName, properties)
    
    // Vercel Analytics
    Analytics.track(eventName, properties)
    
    // 自定义分析
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: eventName, properties })
    }).catch(console.error)
  }
}

// 页面浏览追踪
export const trackPageView = (page: string, title?: string) => {
  trackEvent('page_view', {
    page_title: title || document.title,
    page_location: window.location.href,
    page_path: page
  })
}

// 用户交互追踪
export const trackUserInteraction = (action: string, element: string, value?: any) => {
  trackEvent('user_interaction', {
    action,
    element,
    value
  })
}

// 业务事件追踪
export const trackBusinessEvent = (event: string, data: Record<string, any>) => {
  trackEvent('business_event', {
    event_type: event,
    ...data
  })
}

// 性能追踪
export const trackPerformance = (metric: string, value: number, unit: string = 'ms') => {
  trackEvent('performance_metric', {
    metric_name: metric,
    metric_value: value,
    metric_unit: unit
  })
}
```

#### 3.4.2 性能监控Hook
```typescript
// hooks/usePerformanceMonitoring.ts
import { useEffect } from 'react'
import { trackPerformance } from '@/lib/monitoring/analytics'

export function usePerformanceMonitoring() {
  useEffect(() => {
    // 页面加载性能
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming
          
          trackPerformance('page_load_time', navEntry.loadEventEnd - navEntry.loadEventStart)
          trackPerformance('dom_content_loaded', navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart)
          trackPerformance('first_paint', navEntry.responseEnd - navEntry.responseStart)
        }
        
        if (entry.entryType === 'paint') {
          const paintEntry = entry as PerformancePaintTiming
          trackPerformance(paintEntry.name, paintEntry.startTime)
        }
      }
    })

    observer.observe({ entryTypes: ['navigation', 'paint'] })

    return () => observer.disconnect()
  }, [])

  // 组件渲染性能
  const measureComponentRender = (componentName: string, renderFn: () => void) => {
    const start = performance.now()
    renderFn()
    const end = performance.now()
    
    trackPerformance(`component_render_${componentName}`, end - start)
  }

  return { measureComponentRender }
}
```

## 4. 告警系统

### 4.1 告警规则配置
```typescript
// lib/monitoring/alerts.ts
interface AlertRule {
  id: string
  name: string
  description: string
  condition: AlertCondition
  severity: 'low' | 'medium' | 'high' | 'critical'
  enabled: boolean
  notificationChannels: string[]
  cooldownPeriod: number // 冷却期（秒）
  lastTriggered?: Date
}

interface AlertCondition {
  metric: string
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne'
  threshold: number
  duration: number // 持续时间（秒）
  aggregation?: 'avg' | 'sum' | 'max' | 'min' | 'count'
}

// 告警规则定义
export const alertRules: AlertRule[] = [
  // 系统可用性告警
  {
    id: 'availability-low',
    name: '系统可用性低',
    description: '系统可用性低于99%',
    condition: {
      metric: 'availability',
      operator: 'lt',
      threshold: 99,
      duration: 300
    },
    severity: 'critical',
    enabled: true,
    notificationChannels: ['pagerduty', 'slack'],
    cooldownPeriod: 1800
  },
  
  // 响应时间告警
  {
    id: 'response-time-high',
    name: '响应时间过高',
    description: 'API响应时间超过2秒',
    condition: {
      metric: 'response_time',
      operator: 'gt',
      threshold: 2000,
      duration: 60,
      aggregation: 'avg'
    },
    severity: 'high',
    enabled: true,
    notificationChannels: ['slack'],
    cooldownPeriod: 900
  },
  
  // 错误率告警
  {
    id: 'error-rate-high',
    name: '错误率过高',
    description: 'API错误率超过5%',
    condition: {
      metric: 'error_rate',
      operator: 'gt',
      threshold: 5,
      duration: 120
    },
    severity: 'high',
    enabled: true,
    notificationChannels: ['pagerduty', 'slack'],
    cooldownPeriod: 600
  },
  
  // 数据库连接告警
  {
    id: 'database-connections-high',
    name: '数据库连接数过高',
    description: '数据库连接数超过80%',
    condition: {
      metric: 'database_connections',
      operator: 'gt',
      threshold: 80,
      duration: 180
    },
    severity: 'medium',
    enabled: true,
    notificationChannels: ['slack'],
    cooldownPeriod: 1800
  },
  
  // 内存使用告警
  {
    id: 'memory-usage-high',
    name: '内存使用率过高',
    description: '服务器内存使用率超过90%',
    condition: {
      metric: 'memory_usage',
      operator: 'gt',
      threshold: 90,
      duration: 300
    },
    severity: 'high',
    enabled: true,
    notificationChannels: ['pagerduty', 'slack'],
    cooldownPeriod: 900
  }
]
```

### 4.2 告警处理器
```typescript
// lib/monitoring/alertHandler.ts
import { AlertRule } from './alerts'
import { sendSlackNotification } from './notifications/slack'
import { sendPagerDutyAlert } from './notifications/pagerduty'

export class AlertHandler {
  private triggeredAlerts = new Map<string, Date>()

  async processAlert(rule: AlertRule, currentValue: number) {
    // 检查冷却期
    if (this.isInCooldown(rule)) {
      return
    }

    // 检查告警条件
    if (this.evaluateCondition(rule.condition, currentValue)) {
      await this.triggerAlert(rule, currentValue)
    }
  }

  private isInCooldown(rule: AlertRule): boolean {
    const lastTriggered = this.triggeredAlerts.get(rule.id)
    if (!lastTriggered) return false

    const cooldownEnd = new Date(lastTriggered.getTime() + rule.cooldownPeriod * 1000)
    return new Date() < cooldownEnd
  }

  private evaluateCondition(condition: AlertCondition, value: number): boolean {
    switch (condition.operator) {
      case 'gt': return value > condition.threshold
      case 'gte': return value >= condition.threshold
      case 'lt': return value < condition.threshold
      case 'lte': return value <= condition.threshold
      case 'eq': return value === condition.threshold
      case 'ne': return value !== condition.threshold
      default: return false
    }
  }

  private async triggerAlert(rule: AlertRule, currentValue: number) {
    const alert = {
      id: `${rule.id}-${Date.now()}`,
      rule,
      currentValue,
      timestamp: new Date(),
      message: this.generateAlertMessage(rule, currentValue)
    }

    // 记录告警触发时间
    this.triggeredAlerts.set(rule.id, new Date())

    // 发送通知
    await this.sendNotifications(alert)

    // 记录告警日志
    console.error('Alert triggered:', alert)
  }

  private generateAlertMessage(rule: AlertRule, currentValue: number): string {
    return `🚨 ${rule.name}\n` +
           `描述: ${rule.description}\n` +
           `当前值: ${currentValue}\n` +
           `阈值: ${rule.condition.threshold}\n` +
           `时间: ${new Date().toISOString()}`
  }

  private async sendNotifications(alert: any) {
    const promises = []

    if (alert.rule.notificationChannels.includes('slack')) {
      promises.push(sendSlackNotification(alert))
    }

    if (alert.rule.notificationChannels.includes('pagerduty')) {
      promises.push(sendPagerDutyAlert(alert))
    }

    await Promise.allSettled(promises)
  }
}

export const alertHandler = new AlertHandler()
```

### 4.3 通知渠道

#### 4.3.1 Slack通知
```typescript
// lib/monitoring/notifications/slack.ts
import { WebClient } from '@slack/web-api'

const slack = new WebClient(process.env.SLACK_BOT_TOKEN)

export async function sendSlackNotification(alert: any) {
  try {
    await slack.chat.postMessage({
      channel: process.env.SLACK_ALERT_CHANNEL,
      text: alert.message,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${alert.rule.name}*\n${alert.rule.description}`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*当前值:*\n${alert.currentValue}`
            },
            {
              type: 'mrkdwn',
              text: `*阈值:*\n${alert.rule.condition.threshold}`
            },
            {
              type: 'mrkdwn',
              text: `*严重程度:*\n${alert.rule.severity}`
            },
            {
              type: 'mrkdwn',
              text: `*时间:*\n${alert.timestamp.toISOString()}`
            }
          ]
        }
      ]
    })
  } catch (error) {
    console.error('Failed to send Slack notification:', error)
  }
}
```

#### 4.3.2 PagerDuty告警
```typescript
// lib/monitoring/notifications/pagerduty.ts
export async function sendPagerDutyAlert(alert: any) {
  try {
    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token token=${process.env.PAGERDUTY_INTEGRATION_KEY}`
      },
      body: JSON.stringify({
        routing_key: process.env.PAGERDUTY_ROUTING_KEY,
        event_action: 'trigger',
        dedup_key: alert.id,
        payload: {
          summary: alert.rule.name,
          source: 'openaero-monitoring',
          severity: alert.rule.severity,
          custom_details: {
            description: alert.rule.description,
            current_value: alert.currentValue,
            threshold: alert.rule.condition.threshold,
            timestamp: alert.timestamp.toISOString()
          }
        }
      })
    })

    if (!response.ok) {
      throw new Error(`PagerDuty API error: ${response.status}`)
    }
  } catch (error) {
    console.error('Failed to send PagerDuty alert:', error)
  }
}
```

## 5. 运维自动化

### 5.1 自动扩缩容
```yaml
# kubernetes/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: openaero-web-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: openaero-web
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 2
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 1
        periodSeconds: 60
```

### 5.2 自动故障恢复
```typescript
// lib/monitoring/autoRecovery.ts
export class AutoRecovery {
  private recoveryStrategies = new Map<string, RecoveryStrategy>()

  constructor() {
    this.registerRecoveryStrategies()
  }

  private registerRecoveryStrategies() {
    // 数据库连接恢复
    this.recoveryStrategies.set('database_connection', {
      name: '数据库连接恢复',
      maxAttempts: 3,
      backoffMs: 5000,
      action: async () => {
        // 重新初始化数据库连接
        await prisma.$disconnect()
        await prisma.$connect()
      }
    })

    // Redis连接恢复
    this.recoveryStrategies.set('redis_connection', {
      name: 'Redis连接恢复',
      maxAttempts: 3,
      backoffMs: 3000,
      action: async () => {
        // 重新连接Redis
        await redis.disconnect()
        await redis.connect()
      }
    })

    // 服务重启
    this.recoveryStrategies.set('service_restart', {
      name: '服务重启',
      maxAttempts: 1,
      backoffMs: 0,
      action: async () => {
        // 触发服务重启
        process.exit(1)
      }
    })
  }

  async attemptRecovery(issueType: string, context?: any) {
    const strategy = this.recoveryStrategies.get(issueType)
    if (!strategy) {
      console.warn(`No recovery strategy found for issue type: ${issueType}`)
      return false
    }

    console.log(`Attempting recovery for: ${strategy.name}`)
    
    for (let attempt = 1; attempt <= strategy.maxAttempts; attempt++) {
      try {
        await strategy.action()
        console.log(`Recovery successful for: ${strategy.name} (attempt ${attempt})`)
        return true
      } catch (error) {
        console.error(`Recovery attempt ${attempt} failed for: ${strategy.name}`, error)
        
        if (attempt < strategy.maxAttempts) {
          await this.sleep(strategy.backoffMs * attempt)
        }
      }
    }

    console.error(`All recovery attempts failed for: ${strategy.name}`)
    return false
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

interface RecoveryStrategy {
  name: string
  maxAttempts: number
  backoffMs: number
  action: () => Promise<void>
}
```

### 5.3 健康检查与自愈
```typescript
// lib/monitoring/healthCheck.ts
export class HealthChecker {
  private checks: HealthCheck[] = []
  private autoRecovery: AutoRecovery

  constructor() {
    this.autoRecovery = new AutoRecovery()
    this.registerHealthChecks()
  }

  private registerHealthChecks() {
    // 数据库健康检查
    this.checks.push({
      name: 'database',
      check: async () => {
        await prisma.$queryRaw`SELECT 1`
        return { status: 'healthy' }
      },
      recoveryType: 'database_connection'
    })

    // Redis健康检查
    this.checks.push({
      name: 'redis',
      check: async () => {
        await redis.ping()
        return { status: 'healthy' }
      },
      recoveryType: 'redis_connection'
    })

    // 外部API健康检查
    this.checks.push({
      name: 'external_apis',
      check: async () => {
        // 检查关键外部API
        const responses = await Promise.allSettled([
          fetch('https://api.stripe.com/v1/charges', { method: 'HEAD' }),
          fetch('https://api.sendgrid.com/v3/mail/send', { method: 'HEAD' })
        ])
        
        const allHealthy = responses.every(r => r.status === 'fulfilled')
        return { status: allHealthy ? 'healthy' : 'unhealthy' }
      }
    })
  }

  async runHealthChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = []

    for (const check of this.checks) {
      try {
        const result = await check.check()
        results.push({
          name: check.name,
          status: result.status,
          timestamp: new Date(),
          details: result
        })

        // 如果检查失败且配置了自动恢复，尝试恢复
        if (result.status === 'unhealthy' && check.recoveryType) {
          await this.autoRecovery.attemptRecovery(check.recoveryType)
        }
      } catch (error) {
        results.push({
          name: check.name,
          status: 'unhealthy',
          timestamp: new Date(),
          error: error.message
        })
      }
    }

    return results
  }
}

interface HealthCheck {
  name: string
  check: () => Promise<{ status: 'healthy' | 'unhealthy', [key: string]: any }>
  recoveryType?: string
}

interface HealthCheckResult {
  name: string
  status: 'healthy' | 'unhealthy'
  timestamp: Date
  details?: any
  error?: string
}
```

## 6. 监控仪表盘

### 6.1 Grafana仪表盘配置
```json
{
  "dashboard": {
    "title": "OpenAero Monitoring Dashboard",
    "panels": [
      {
        "title": "系统可用性",
        "type": "stat",
        "targets": [
          {
            "expr": "avg(availability) * 100",
            "legendFormat": "可用性 %"
          }
        ],
        "thresholds": [
          { "value": 0, "color": "red" },
          { "value": 95, "color": "yellow" },
          { "value": 99, "color": "green" }
        ]
      },
      {
        "title": "响应时间",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ]
      },
      {
        "title": "错误率",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m]) / rate(http_requests_total[5m]) * 100",
            "legendFormat": "错误率 %"
          }
        ]
      },
      {
        "title": "业务指标",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(user_registrations_total[1h])",
            "legendFormat": "用户注册/小时"
          },
          {
            "expr": "rate(orders_created_total[1h])",
            "legendFormat": "订单创建/小时"
          }
        ]
      }
    ]
  }
}
```

### 6.2 自定义监控面板
```typescript
// components/monitoring/Dashboard.tsx
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MetricData {
  name: string
  value: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  change: number
}

export function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<MetricData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/monitoring/metrics')
        const data = await response.json()
        setMetrics(data)
      } catch (error) {
        console.error('Failed to fetch metrics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000) // 30秒更新一次

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <div>Loading metrics...</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric) => (
        <Card key={metric.name}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {metric.name}
            </CardTitle>
            <span className={`text-xs ${
              metric.trend === 'up' ? 'text-green-600' : 
              metric.trend === 'down' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {metric.trend === 'up' ? '↗' : 
               metric.trend === 'down' ? '↘' : '→'}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metric.value.toLocaleString()} {metric.unit}
            </div>
            <p className="text-xs text-muted-foreground">
              {metric.change > 0 ? '+' : ''}{metric.change}% from last hour
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

## 7. 总结

本监控与运维体系设计为OpenAero项目提供了：

1. **全面的监控覆盖**：从用户体验到基础设施的全方位监控
2. **智能告警系统**：基于阈值的自动告警和通知
3. **自动化运维**：自动扩缩容、故障恢复和健康检查
4. **可视化监控**：直观的监控仪表盘和实时数据展示
5. **日志管理**：结构化的日志收集、分析和存储
6. **性能优化**：基于监控数据的性能优化建议
7. **运维自动化**：减少人工干预，提高系统稳定性

这个监控体系将确保OpenAero平台在长期运行中保持高可用性、高性能和良好的用户体验，为业务发展提供坚实的技术保障。

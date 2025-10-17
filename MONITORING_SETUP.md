# OpenAero 监控和错误追踪配置指南

## 🎯 监控策略

### 1. 性能监控（Vercel Analytics）
Vercel自动提供性能监控，包括：
- Core Web Vitals (LCP, FID, CLS)
- 页面加载时间
- API响应时间

### 2. 错误追踪（Sentry）

#### 安装 Sentry
```bash
npm install --save @sentry/nextjs
```

#### 配置步骤

1. **创建 `sentry.client.config.js`**
```javascript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
```

2. **创建 `sentry.server.config.js`**
```javascript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
});
```

3. **创建 `sentry.edge.config.js`**
```javascript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
});
```

4. **更新 `next.config.js`**
```javascript
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  // ... 现有配置
};

module.exports = withSentryConfig(
  nextConfig,
  {
    silent: true,
    org: "your-org",
    project: "openaero-web",
  },
  {
    widenClientFileUpload: true,
    transpileClientSDK: true,
    tunnelRoute: "/monitoring",
    hideSourceMaps: true,
    disableLogger: true,
  }
);
```

5. **添加环境变量到 `.env.local`**
```bash
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_AUTH_TOKEN=your-auth-token
```

### 3. 日志系统

#### 创建日志工具 `src/lib/logger.ts`
```typescript
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(entry: LogEntry): string {
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    // 开发环境：输出到控制台
    if (this.isDevelopment) {
      console[level](this.formatMessage(entry), context || '');
    }

    // 生产环境：发送到日志服务
    if (!this.isDevelopment && typeof window !== 'undefined') {
      // 可以发送到远程日志服务
      this.sendToRemote(entry);
    }
  }

  private sendToRemote(entry: LogEntry) {
    // 发送到远程日志服务（如 Datadog, LogRocket等）
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).catch(err => console.error('Failed to send log', err));
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, any>) {
    this.log('error', message, context);
  }

  debug(message: string, context?: Record<string, any>) {
    if (this.isDevelopment) {
      this.log('debug', message, context);
    }
  }
}

export const logger = new Logger();
```

### 4. 性能监控API

#### 创建 `src/lib/performance.ts`
```typescript
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number> = new Map();

  static getInstance() {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMeasure(name: string) {
    performance.mark(`${name}-start`);
  }

  endMeasure(name: string) {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name)[0];
    if (measure) {
      this.metrics.set(name, measure.duration);
      this.reportMetric(name, measure.duration);
    }
  }

  private reportMetric(name: string, duration: number) {
    // 发送到分析服务
    if (typeof window !== 'undefined' && duration > 1000) {
      console.warn(`Slow operation detected: ${name} took ${duration}ms`);
      
      // 发送到监控服务
      fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, duration, timestamp: Date.now() }),
      }).catch(err => console.error('Failed to report metric', err));
    }
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }
}

export const perfMonitor = PerformanceMonitor.getInstance();
```

### 5. 用户行为分析

#### Google Analytics 4配置
在 `src/app/layout.tsx` 添加：
```typescript
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        {/* Google Analytics */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### 6. API日志中间件

#### 创建 `src/middleware.ts`
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

export function middleware(request: NextRequest) {
  const start = Date.now();
  const { pathname } = request.nextUrl;

  // API请求日志
  if (pathname.startsWith('/api/')) {
    logger.info(`API Request: ${request.method} ${pathname}`);
  }

  const response = NextResponse.next();

  // 响应时间监控
  if (pathname.startsWith('/api/')) {
    const duration = Date.now() - start;
    response.headers.set('X-Response-Time', `${duration}ms`);
    
    if (duration > 1000) {
      logger.warn(`Slow API response: ${pathname} took ${duration}ms`);
    }
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

## 📊 监控仪表板

### Vercel Analytics
- 访问：https://vercel.com/your-project/analytics
- 查看：Core Web Vitals, 页面性能

### Sentry
- 访问：https://sentry.io/your-project
- 查看：错误、性能追踪、用户会话

### Google Analytics 4
- 访问：https://analytics.google.com
- 查看：用户行为、转化率、流量来源

## 🚨 告警配置

### Sentry告警规则
1. 错误率 > 1%
2. 响应时间 > 3秒
3. 内存使用 > 90%

### 通知渠道
- Email
- Slack
- PagerDuty（紧急情况）

## 📝 日志等级

- **DEBUG**: 开发调试信息
- **INFO**: 正常操作信息
- **WARN**: 警告信息，需要关注
- **ERROR**: 错误信息，需要立即处理

## 🎯 关键指标

### 性能指标
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1
- TTFB (Time to First Byte): < 600ms

### 业务指标
- 错误率: < 0.1%
- API成功率: > 99.9%
- 页面加载时间: < 3s
- 用户会话时长: > 5min

## 🔧 环境变量

添加到 `.env.local`:
```bash
# Sentry
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_AUTH_TOKEN=your-auth-token

# Google Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# 监控开关
NEXT_PUBLIC_ENABLE_MONITORING=true
```

## ✅ 验证清单

- [ ] Sentry已配置并测试
- [ ] Google Analytics已配置
- [ ] Vercel Analytics已启用
- [ ] 日志系统正常工作
- [ ] 性能监控正常上报
- [ ] 告警规则已设置
- [ ] 监控仪表板可访问

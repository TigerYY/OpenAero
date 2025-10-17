# 开元空御监控系统指南

本文档介绍开元空御项目的监控系统配置和使用方法。

## 📊 监控系统概览

我们的监控系统包含以下组件：

- **错误追踪**: Sentry
- **性能监控**: Web Vitals + Sentry Performance
- **健康检查**: 自定义健康检查API
- **日志记录**: 结构化日志系统
- **监控仪表板**: 实时系统状态监控

## 🔧 配置说明

### 1. 环境变量配置

在 `.env.local` 文件中添加以下配置：

```env
# Sentry配置
SENTRY_DSN="your-sentry-dsn"
SENTRY_ORG="your-sentry-org"
SENTRY_PROJECT="your-sentry-project"
SENTRY_AUTH_TOKEN="your-sentry-auth-token"
NEXT_PUBLIC_SENTRY_DSN="your-sentry-dsn"

# 分析配置
NEXT_PUBLIC_ANALYTICS_ID="your-analytics-id"
```

### 2. Sentry项目设置

1. 在 [Sentry](https://sentry.io) 创建新项目
2. 选择 "Next.js" 作为平台
3. 获取 DSN 和认证令牌
4. 配置环境变量

## 🚀 功能特性

### 错误追踪

- **自动错误捕获**: 自动捕获未处理的错误
- **用户上下文**: 记录用户信息和会话数据
- **错误分组**: 智能错误分组和去重
- **性能影响**: 监控错误对性能的影响

```typescript
import { ErrorMonitor } from '@/lib/monitoring';

// 捕获错误
ErrorMonitor.captureError(error, {
  component: 'SolutionCard',
  action: 'render',
  userId: 'user-123',
});
```

### 性能监控

- **Web Vitals**: 监控核心性能指标
- **API性能**: 监控API响应时间
- **数据库性能**: 监控数据库查询性能
- **用户体验**: 监控用户交互性能

```typescript
import { initPerformanceMonitoring } from '@/lib/monitoring';

// 初始化性能监控
initPerformanceMonitoring();
```

### 健康检查

- **系统状态**: 实时监控系统健康状态
- **服务检查**: 检查数据库和API服务状态
- **资源监控**: 监控内存和CPU使用情况
- **响应时间**: 监控服务响应时间

访问 `/api/health` 获取健康检查数据：

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "database": {
      "status": "connected",
      "responseTime": 45
    },
    "api": {
      "status": "operational",
      "responseTime": 120
    }
  },
  "uptime": 86400,
  "memory": {
    "used": 256,
    "total": 512,
    "percentage": 50
  }
}
```

### 日志记录

- **结构化日志**: 统一的日志格式
- **日志级别**: DEBUG, INFO, WARN, ERROR
- **上下文信息**: 自动添加上下文信息
- **Sentry集成**: 自动发送到Sentry

```typescript
import { logger } from '@/lib/logger';

// 创建组件日志记录器
const componentLogger = logger.child({
  component: 'SolutionCard',
  userId: 'user-123',
});

// 记录日志
componentLogger.info('Solution loaded successfully');
componentLogger.error('Failed to load solution', error);
```

## 📈 监控仪表板

访问 `/admin/monitoring` 查看实时监控仪表板：

### 功能特性

- **实时状态**: 实时显示系统状态
- **服务监控**: 监控各个服务的健康状态
- **性能指标**: 显示关键性能指标
- **资源使用**: 监控内存和CPU使用情况
- **自动刷新**: 每30秒自动刷新数据

### 状态指示器

- 🟢 **绿色**: 健康/正常
- 🟡 **黄色**: 警告/降级
- 🔴 **红色**: 错误/不可用

## 🔍 监控最佳实践

### 1. 错误监控

- 在关键业务逻辑中添加错误处理
- 使用有意义的错误消息和上下文
- 定期检查错误报告和趋势

```typescript
try {
  const result = await apiCall();
  return result;
} catch (error) {
  ErrorMonitor.captureError(error, {
    component: 'SolutionService',
    action: 'fetchSolutions',
    userId: user?.id,
  });
  throw error;
}
```

### 2. 性能监控

- 监控关键用户路径的性能
- 设置合理的性能阈值
- 定期分析性能报告

```typescript
// 监控API调用性能
const result = await APIMonitor.trackAPICall(
  () => fetchSolutions(filters),
  '/api/solutions',
  'GET'
);
```

### 3. 业务指标

- 跟踪关键业务指标
- 监控用户行为
- 分析业务趋势

```typescript
import { BusinessMetrics } from '@/lib/monitoring';

// 跟踪解决方案查看
BusinessMetrics.trackSolutionView(solutionId, solutionTitle);

// 跟踪搜索行为
BusinessMetrics.trackSearch(query, resultsCount, filters);
```

## 🚨 告警配置

### Sentry告警

1. 在Sentry中配置告警规则
2. 设置错误频率阈值
3. 配置通知渠道（邮件、Slack等）

### 健康检查告警

1. 配置负载均衡器健康检查
2. 设置监控服务（如UptimeRobot）
3. 配置告警通知

## 📊 监控报告

### 日常监控

- 检查错误报告
- 查看性能趋势
- 监控系统资源使用

### 定期分析

- 每周性能报告
- 每月错误分析
- 季度系统优化

## 🔧 故障排除

### 常见问题

1. **Sentry未捕获错误**
   - 检查DSN配置
   - 确认Sentry初始化
   - 检查网络连接

2. **性能监控数据不准确**
   - 检查采样率配置
   - 确认Web Vitals支持
   - 验证浏览器兼容性

3. **健康检查失败**
   - 检查数据库连接
   - 验证API服务状态
   - 查看系统资源

### 调试工具

- 浏览器开发者工具
- Sentry调试模式
- 服务器日志分析

## 📚 相关文档

- [Sentry Next.js文档](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Web Vitals文档](https://web.dev/vitals/)
- [Next.js性能优化](https://nextjs.org/docs/advanced-features/measuring-performance)

## 🤝 支持

如有监控系统相关问题，请联系开发团队或查看相关文档。

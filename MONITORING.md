# 监控系统文档

## 概述

OpenAero 项目集成了全面的监控和质量指标系统，用于跟踪应用性能、错误、业务指标和代码质量。

## 核心组件

### 1. 性能监控 (Performance Monitoring)

#### 功能特性
- **Web Vitals 指标**: 自动收集 CLS、FCP、LCP、TTFB 等核心性能指标
- **实时监控**: 在生产环境中持续监控用户体验
- **阈值告警**: 当性能指标超出预设阈值时自动告警

#### 使用方法
```typescript
import { initPerformanceMonitoring } from '@/lib/monitoring';

// 在应用启动时初始化
initPerformanceMonitoring();
```

#### 配置参数
```typescript
const PERFORMANCE_CONFIG = {
  thresholds: {
    CLS: 0.1,      // Cumulative Layout Shift
    FID: 100,      // First Input Delay
    FCP: 1800,     // First Contentful Paint
    LCP: 2500,     // Largest Contentful Paint
    TTFB: 600,     // Time to First Byte
  },
  sampleRate: 0.1, // 生产环境采样率
};
```

### 2. 错误监控 (Error Monitoring)

#### 功能特性
- **自动错误捕获**: 集成 Sentry 进行错误跟踪
- **用户上下文**: 记录用户信息和操作路径
- **面包屑追踪**: 详细的操作历史记录

#### 使用方法
```typescript
import { ErrorMonitor } from '@/lib/monitoring';

// 捕获错误
ErrorMonitor.captureError(error, { context: 'user-action' });

// 记录消息
ErrorMonitor.captureMessage('重要操作完成', 'info');

// 设置用户信息
ErrorMonitor.setUser({ id: 'user123', email: 'user@example.com' });
```

### 3. API 监控 (API Monitoring)

#### 功能特性
- **请求跟踪**: 自动记录 API 调用时间和状态
- **错误率统计**: 监控 API 成功率和失败率
- **性能分析**: 分析 API 响应时间分布

#### 使用方法
```typescript
import { APIMonitor } from '@/lib/monitoring';

// 包装 API 调用
const result = await APIMonitor.trackAPICall(
  () => fetch('/api/solutions'),
  '/api/solutions',
  'GET'
);
```

### 4. 业务指标监控 (Business Metrics)

#### 功能特性
- **用户行为跟踪**: 记录关键用户操作
- **转化率分析**: 跟踪业务流程转化情况
- **自定义事件**: 支持业务特定的指标收集

#### 使用方法
```typescript
import { BusinessMetrics } from '@/lib/monitoring';

// 跟踪解决方案查看
BusinessMetrics.trackSolutionView('solution-123', '解决方案标题');

// 跟踪搜索行为
BusinessMetrics.trackSearch('关键词', 10, { category: 'tech' });

// 跟踪创作者申请
BusinessMetrics.trackCreatorApplication('creator-456', 'completed');
```

### 5. 质量指标监控 (Quality Monitoring)

#### 功能特性
- **测试覆盖率**: 自动记录代码覆盖率指标
- **性能评分**: 跟踪应用性能评分
- **安全审计**: 记录安全漏洞检查结果
- **可访问性**: 监控无障碍访问合规性
- **包大小**: 跟踪构建产物大小变化

#### 使用方法
```typescript
import { QualityMonitor } from '@/lib/monitoring';

// 记录测试覆盖率
QualityMonitor.recordTestCoverage({
  lines: 85.5,
  functions: 90.2,
  branches: 78.3,
  statements: 87.1
});

// 记录性能评分
QualityMonitor.recordPerformanceScore(92.5, {
  lighthouse: true,
  metrics: ['FCP', 'LCP', 'CLS']
});

// 记录安全审计
QualityMonitor.recordSecurityAudit(0, {
  tool: 'npm audit',
  scanTime: Date.now()
});
```

## 质量仪表板

### 访问路径
- 开发环境: `http://localhost:3000/admin/monitoring`
- 生产环境: `https://your-domain.com/admin/monitoring`

### 功能特性
- **实时数据**: 显示最新的质量指标数据
- **历史趋势**: 展示指标变化趋势
- **分类统计**: 按指标类型分组显示
- **通过率分析**: 计算各类指标的通过率
- **告警提醒**: 突出显示未达标的指标

### 界面组件
1. **总体概览**: 显示总检查数、通过数、失败数和通过率
2. **分类详情**: 按测试覆盖率、性能、安全、可访问性、包大小分类显示
3. **最近记录**: 展示最新的检查记录和结果
4. **趋势分析**: 显示指标变化趋势（改善/下降/稳定）

## API 端点

### 质量指标 API

#### POST /api/monitoring/quality
提交新的质量指标数据

**请求体**:
```json
{
  "type": "coverage",
  "score": 85.5,
  "threshold": 80,
  "passed": true,
  "timestamp": 1640995200000,
  "details": {
    "lines": 85.5,
    "functions": 90.2
  }
}
```

#### GET /api/monitoring/quality
获取质量指标数据和统计信息

**查询参数**:
- `hours`: 时间范围（小时），默认 24
- `type`: 指标类型过滤

**响应**:
```json
{
  "stats": {
    "overall": {
      "total": 100,
      "passed": 85,
      "failed": 15,
      "passRate": 85.0
    },
    "byType": {
      "coverage": {
        "count": 20,
        "passed": 18,
        "failed": 2,
        "passRate": 90.0,
        "avgScore": 87.5,
        "latestScore": 89.2,
        "trend": "improving"
      }
    }
  },
  "metrics": [...]
}
```

## 配置和部署

### 环境变量
```bash
# Sentry 配置
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project

# 监控配置
MONITORING_ENABLED=true
MONITORING_SAMPLE_RATE=0.1
```

### 生产环境配置
1. 确保 Sentry DSN 已正确配置
2. 设置适当的采样率以控制数据量
3. 配置告警规则和通知渠道
4. 定期检查监控数据的存储和清理策略

## 最佳实践

### 1. 性能监控
- 在关键页面和组件中添加性能标记
- 定期检查 Web Vitals 指标
- 优化影响用户体验的性能瓶颈

### 2. 错误监控
- 为关键业务流程添加详细的错误上下文
- 定期检查错误率和错误类型分布
- 及时修复高频错误和关键错误

### 3. 质量指标
- 设置合理的质量阈值
- 在 CI/CD 流程中集成质量检查
- 定期审查和调整质量标准

### 4. 数据隐私
- 避免在监控数据中包含敏感信息
- 遵循数据保护法规要求
- 定期清理过期的监控数据

## 故障排除

### 常见问题

1. **监控数据未显示**
   - 检查环境变量配置
   - 确认 Sentry DSN 有效
   - 验证网络连接

2. **性能指标异常**
   - 检查采样率设置
   - 确认页面加载完成
   - 验证浏览器兼容性

3. **质量仪表板无法访问**
   - 确认路由配置正确
   - 检查权限设置
   - 验证 API 端点可用性

### 调试模式
在开发环境中启用详细日志：
```typescript
// 在浏览器控制台中设置
localStorage.setItem('monitoring-debug', 'true');
```

## 更新日志

### v1.0.0 (2024-01-XX)
- 初始版本发布
- 集成基础监控功能
- 添加质量指标仪表板
- 支持多种指标类型跟踪

---

如需更多帮助或有问题反馈，请联系开发团队或查看项目 GitHub Issues。
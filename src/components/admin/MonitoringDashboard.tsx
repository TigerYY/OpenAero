'use client';

import { useState, useEffect } from 'react';
import { Activity, AlertCircle, TrendingUp, Server, Database, Zap, Clock } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

// 健康检查响应类型
interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  services: {
    database: {
      status: 'connected' | 'disconnected' | 'error';
      responseTime?: number;
      error?: string;
    };
    api: {
      status: 'operational' | 'degraded' | 'down';
      responseTime: number;
    };
  };
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

// 状态指示器组件
function StatusIndicator({ status, label }: { status: string; label: string }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'operational':
        return 'text-green-600 bg-green-100';
      case 'unhealthy':
      case 'disconnected':
      case 'down':
        return 'text-red-600 bg-red-100';
      case 'degraded':
      case 'error':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
        {status}
      </div>
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  );
}

interface MonitoringStats {
  period: string;
  totalLogs: number;
  successLogs: number;
  errorLogs: number;
  successRate: number;
  actionStats: Array<{ action: string; count: number }>;
  resourceStats: Array<{ resource: string; count: number }>;
  topUsers: Array<{ userId: string; count: number }>;
  recentErrors: Array<{
    id: string;
    action: string;
    errorMessage: string | null;
    createdAt: Date;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    resource: string;
    resourceId: string | null;
    userId: string | null;
    success: boolean;
    createdAt: Date;
  }>;
}

interface PerformanceData {
  period: string;
  totalRequests: number;
  totalUsers: number;
  dbQueries: number;
  avgResponseTime: number;
  hourlyStats: Array<{
    hour: string;
    count: number;
    avgDuration: number;
  }>;
  peakHour: {
    hour: string;
    count: number;
    avgDuration: number;
  };
}

// 监控仪表板组件
export function MonitoringDashboard() {
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const [monitoringStats, setMonitoringStats] = useState<MonitoringStats | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // 获取所有监控数据
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 并行获取所有数据
      const [healthResponse, statsResponse, performanceResponse] = await Promise.all([
        fetch('/api/health').catch(() => null),
        fetch('/api/admin/monitoring/stats?period=24h').catch(() => null),
        fetch('/api/admin/monitoring/performance?period=24h').catch(() => null),
      ]);

      // 处理健康检查数据
      if (healthResponse?.ok) {
        const healthData = await healthResponse.json();
        if (healthData && typeof healthData === 'object') {
          setHealthData(healthData);
        }
      }

      // 处理监控统计数据
      if (statsResponse?.ok) {
        const statsResult = await statsResponse.json();
        if (statsResult.success && statsResult.data) {
          setMonitoringStats(statsResult.data);
        }
      }

      // 处理性能数据
      if (performanceResponse?.ok) {
        const perfResult = await performanceResponse.json();
        if (perfResult.success && perfResult.data) {
          setPerformanceData(perfResult.data);
        }
      }

      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to fetch monitoring data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch monitoring data');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和定时刷新
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!isMounted) return;
      await fetchAllData();
    };

    fetchData();

    // 每30秒刷新一次
    const interval = setInterval(() => {
      if (isMounted) {
        fetchData();
      }
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // 格式化运行时间
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading && !healthData && !monitoringStats) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" message="加载监控数据中..." />
      </div>
    );
  }

  if (error && !healthData && !monitoringStats) {
    return (
      <div className="p-8">
        <ErrorMessage error={error} className="mb-4" />
        <Button onClick={fetchAllData} variant="outline" size="sm">
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">系统监控</h1>
          <p className="text-gray-600">实时监控系统健康状态和性能指标</p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdate && (
            <p className="text-sm text-gray-500">
              最后更新: {formatTimestamp(lastUpdate.toISOString())}
            </p>
          )}
          <Button onClick={fetchAllData} variant="outline" size="sm">
            刷新
          </Button>
        </div>
      </div>

      {error && <ErrorMessage error={error} className="mb-4" />}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="performance">性能</TabsTrigger>
          <TabsTrigger value="errors">错误追踪</TabsTrigger>
          <TabsTrigger value="activity">活动日志</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">

      {/* 整体状态概览 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">系统状态</h2>
          <StatusIndicator status={healthData?.status || 'unknown'} label="整体状态" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{healthData?.version || 'N/A'}</div>
            <div className="text-sm text-gray-600">版本号</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{healthData?.environment || 'N/A'}</div>
            <div className="text-sm text-gray-600">环境</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {healthData?.uptime ? formatUptime(healthData.uptime) : 'N/A'}
            </div>
            <div className="text-sm text-gray-600">运行时间</div>
          </div>
        </div>
      </Card>

          {/* 服务状态 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 数据库状态 */}
            {healthData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    数据库
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <StatusIndicator
                      status={healthData.services?.database?.status || 'unknown'}
                      label="连接状态"
                    />
                    {healthData.services?.database?.responseTime && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">响应时间</span>
                        <span className="text-sm font-medium">
                          {healthData.services.database.responseTime}ms
                        </span>
                      </div>
                    )}
                    {healthData.services?.database?.error && (
                      <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        错误: {healthData.services.database.error}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* API状态 */}
            {healthData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    API服务
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <StatusIndicator
                      status={healthData.services?.api?.status || 'unknown'}
                      label="服务状态"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">响应时间</span>
                      <span className="text-sm font-medium">
                        {healthData.services?.api?.responseTime || 0}ms
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 内存使用情况 */}
          {healthData && (
            <Card>
              <CardHeader>
                <CardTitle>内存使用</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">使用量</span>
                    <span className="text-sm font-medium">
                      {healthData.memory?.used || 0}MB / {healthData.memory?.total || 0}MB
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        (healthData.memory?.percentage || 0) > 80
                          ? 'bg-red-500'
                          : (healthData.memory?.percentage || 0) > 60
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${healthData.memory?.percentage || 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">使用率</span>
                    <span className="font-medium">{healthData.memory?.percentage || 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 操作统计 */}
          {monitoringStats && (
            <Card>
              <CardHeader>
                <CardTitle>操作统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {monitoringStats.actionStats.slice(0, 8).map((stat) => (
                    <div key={stat.action} className="text-center">
                      <div className="text-lg font-bold text-gray-900">{stat.count}</div>
                      <div className="text-xs text-gray-600 truncate">{stat.action}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {performanceData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">总请求数</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {performanceData.totalRequests}
                        </p>
                      </div>
                      <Activity className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">平均响应时间</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {performanceData.avgResponseTime.toFixed(2)}ms
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">数据库查询</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {performanceData.dbQueries}
                        </p>
                      </div>
                      <Database className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 每小时统计图表 */}
              {performanceData.hourlyStats.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>每小时请求统计</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {performanceData.hourlyStats.map((stat) => {
                        const maxCount = Math.max(...performanceData.hourlyStats.map((s) => s.count));
                        const percentage = maxCount > 0 ? (stat.count / maxCount) * 100 : 0;
                        return (
                          <div key={stat.hour} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{stat.hour}</span>
                              <span className="font-medium">
                                {stat.count} 请求 ({stat.avgDuration.toFixed(2)}ms)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-gray-500">
                  <Zap className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p>暂无性能数据</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="errors" className="space-y-6">
          {monitoringStats && monitoringStats.recentErrors.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>最近错误</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monitoringStats.recentErrors.map((error) => (
                    <div
                      key={error.id}
                      className="p-4 border border-red-200 rounded-lg bg-red-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span className="font-medium text-red-900">{error.action}</span>
                          </div>
                          {error.errorMessage && (
                            <p className="text-sm text-red-700 mt-1">{error.errorMessage}</p>
                          )}
                          <p className="text-xs text-red-600 mt-2">
                            {formatTimestamp(error.createdAt.toString())}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
                  <p>暂无错误</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          {monitoringStats && monitoringStats.recentActivity.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>最近活动</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {monitoringStats.recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        activity.success ? 'bg-green-50' : 'bg-red-50'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {activity.success ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className="font-medium text-gray-900">{activity.action}</span>
                          <span className="text-sm text-gray-600">on {activity.resource}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTimestamp(activity.createdAt.toString())}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-gray-500">
                  <Activity className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p>暂无活动记录</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

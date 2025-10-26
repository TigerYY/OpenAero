'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

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

// 监控仪表板组件
export function MonitoringDashboard() {
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // 获取健康检查数据
  const fetchHealthData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/health');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // 验证数据结构
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format');
      }
      
      setHealthData(data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to fetch health data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch health data');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和定时刷新
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (!isMounted) return;
      await fetchHealthData();
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

  if (loading && !healthData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载监控数据中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <h3 className="text-red-800 font-medium">监控数据加载失败</h3>
          </div>
          <p className="text-red-700 text-sm mb-4">{error}</p>
          <Button onClick={fetchHealthData} variant="outline" size="sm">
            重试
          </Button>
        </div>
      </div>
    );
  }

  if (!healthData) {
    return null;
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
          <Button onClick={fetchHealthData} variant="outline" size="sm">
            刷新
          </Button>
        </div>
      </div>

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
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">数据库</h3>
          <div className="space-y-3">
            <StatusIndicator 
              status={healthData?.services?.database?.status || 'unknown'} 
              label="连接状态" 
            />
            {healthData?.services?.database?.responseTime && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">响应时间</span>
                <span className="text-sm font-medium">
                  {healthData.services.database.responseTime}ms
                </span>
              </div>
            )}
            {healthData?.services?.database?.error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                错误: {healthData.services.database.error}
              </div>
            )}
          </div>
        </Card>

        {/* API状态 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">API服务</h3>
          <div className="space-y-3">
            <StatusIndicator 
              status={healthData?.services?.api?.status || 'unknown'} 
              label="服务状态" 
            />
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">响应时间</span>
              <span className="text-sm font-medium">
                {healthData?.services?.api?.responseTime || 0}ms
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* 内存使用情况 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">内存使用</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">使用量</span>
              <span className="text-sm font-medium">
                {healthData?.memory?.used || 0}MB / {healthData?.memory?.total || 0}MB
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  (healthData?.memory?.percentage || 0) > 80
                    ? 'bg-red-500'
                    : (healthData?.memory?.percentage || 0) > 60
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${healthData?.memory?.percentage || 0}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">使用率</span>
              <span className="font-medium">{healthData?.memory?.percentage || 0}%</span>
            </div>
          </div>
        </Card>

      {/* 系统信息 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">系统信息</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">最后更新</span>
            <span className="text-sm font-medium">
              {healthData?.timestamp ? formatTimestamp(healthData.timestamp) : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">运行时间</span>
            <span className="text-sm font-medium">
              {healthData?.uptime ? formatUptime(healthData.uptime) : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">环境</span>
            <span className="ml-2 font-medium">{healthData?.environment || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">版本</span>
            <span className="ml-2 font-medium">{healthData?.version || 'N/A'}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

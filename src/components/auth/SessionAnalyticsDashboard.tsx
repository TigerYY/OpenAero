// 会话分析仪表板组件

'use client';

import React, { useState } from 'react';
import { useSessionAnalytics, useSessionStats, useRealtimeSessionMonitor } from '@/hooks/useSessionAnalytics';

interface SessionAnalyticsDashboardProps {
  className?: string;
}

export function SessionAnalyticsDashboard({ className = '' }: SessionAnalyticsDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('day');
  const { analytics, refreshAnalytics, loading, error } = useSessionAnalytics(selectedPeriod);
  const { stats } = useSessionStats();
  const { currentSessionStatus, realtimeStats } = useRealtimeSessionMonitor();

  // 格式化时长
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟`;
    }
    return `${minutes}分钟`;
  };

  // 格式化时间
  const formatTime = (date: Date | null) => {
    if (!date) return '未知';
    return date.toLocaleString('zh-CN');
  };

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <h3 className="text-lg font-semibold text-red-800 mb-2">分析数据加载失败</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={refreshAnalytics}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 头部控制 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">会话分析</h2>
        
        <div className="flex items-center space-x-4">
          {/* 时间段选择 */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as 'day' | 'week' | 'month')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="day">今天</option>
            <option value="week">本周</option>
            <option value="month">本月</option>
          </select>
          
          <button
            onClick={refreshAnalytics}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '刷新中...' : '刷新'}
          </button>
        </div>
      </div>

      {/* 实时会话状态 */}
      {currentSessionStatus && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">当前会话状态</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-2xl mb-2 ${currentSessionStatus.isActive ? 'text-green-500' : 'text-gray-400'}`}>
                {currentSessionStatus.isActive ? '🟢' : '⚪'}
              </div>
              <div className="text-sm font-medium">
                {currentSessionStatus.isActive ? '活跃中' : '空闲'}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {formatDuration(currentSessionStatus.duration)}
              </div>
              <div className="text-sm text-gray-600">会话时长</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-2">
                {currentSessionStatus.activityCount}
              </div>
              <div className="text-sm text-gray-600">活动次数</div>
            </div>
            
            <div className="text-center">
              <div className="text-sm font-medium text-gray-800 mb-2">
                {formatTime(realtimeStats.lastActivity)}
              </div>
              <div className="text-sm text-gray-600">最后活动</div>
            </div>
          </div>
        </div>
      )}

      {/* 实时统计 */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">实时统计</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {realtimeStats.apiCallsPerMinute}
            </div>
            <div className="text-sm text-blue-800">API调用/分钟</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {realtimeStats.averageResponseTime}ms
            </div>
            <div className="text-sm text-green-800">平均响应时间</div>
          </div>
          
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-3xl font-bold text-red-600 mb-2">
              {realtimeStats.errorCount}
            </div>
            <div className="text-sm text-red-800">错误次数</div>
          </div>
        </div>
      </div>

      {/* 会话统计概览 */}
      {stats && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">会话统计概览</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {stats.totalSessions}
              </div>
              <div className="text-sm text-gray-600">总会话数</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {stats.activeSessions}
              </div>
              <div className="text-sm text-gray-600">活跃会话</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600 mb-2">
                {stats.averageSessionDuration}分钟
              </div>
              <div className="text-sm text-gray-600">平均时长</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600 mb-2">
                {stats.totalApiCalls}
              </div>
              <div className="text-sm text-gray-600">API调用</div>
            </div>
          </div>
        </div>
      )}

      {/* API统计 */}
      {stats && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">API统计</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {stats.totalApiCalls}
              </div>
              <div className="text-sm text-gray-600">总调用次数</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className={`text-2xl font-bold mb-2 ${
                stats.errorRate > 5 ? 'text-red-600' : 'text-green-600'
              }`}>
                {stats.errorRate}%
              </div>
              <div className="text-sm text-gray-600">错误率</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600 mb-2">
                {stats.totalActivities}
              </div>
              <div className="text-sm text-gray-600">总活动数</div>
            </div>
          </div>
        </div>
      )}

      {/* 活动时间分布 */}
      {analytics && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">活动时间分布</h3>
          
          <div className="space-y-2">
            {analytics.metrics.activityByHour.map(({ hour, count }) => (
              <div key={hour} className="flex items-center">
                <div className="w-12 text-sm text-gray-600">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-gray-200 rounded-full h-4 relative">
                    <div
                      className="bg-blue-500 h-4 rounded-full"
                      style={{
                        width: `${Math.max(count / Math.max(...analytics.metrics.activityByHour.map(h => h.count)) * 100, 2)}%`
                      }}
                    />
                  </div>
                </div>
                <div className="w-12 text-sm text-gray-800 text-right">
                  {count}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 设备活动排行 */}
      {analytics && analytics.metrics.mostActiveDevices.length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">设备活动排行</h3>
          
          <div className="space-y-3">
            {analytics.metrics.mostActiveDevices.map((device, index) => (
              <div key={device.deviceId} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="text-lg font-bold text-gray-400">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{device.deviceName}</div>
                    <div className="text-sm text-gray-600">
                      设备ID: {device.deviceId.slice(-8)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">
                    {device.activityCount}
                  </div>
                  <div className="text-sm text-gray-600">活动次数</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 页面访问排行 */}
      {analytics && analytics.metrics.topPages.length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">页面访问排行</h3>
          
          <div className="space-y-3">
            {analytics.metrics.topPages.map((page, index) => (
              <div key={page.page} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="text-lg font-bold text-gray-400">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{page.page}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">
                    {page.views}
                  </div>
                  <div className="text-sm text-gray-600">访问次数</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 最近活动 */}
      {analytics && analytics.activities.length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">最近活动</h3>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {analytics.activities.slice(-20).reverse().map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-2 border-b">
                <div className="flex items-center space-x-3">
                  <div className="text-sm">
                    {getActivityIcon(activity.activityType)}
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {getActivityDescription(activity)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </div>
                
                {activity.details && (
                  <div className="text-xs text-gray-600">
                    {activity.details.statusCode && (
                      <span className={`px-2 py-1 rounded ${
                        activity.details.statusCode < 400 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {activity.details.statusCode}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 获取活动图标
function getActivityIcon(activityType: string): string {
  switch (activityType) {
    case 'login':
      return '🔐';
    case 'logout':
      return '🚪';
    case 'refresh':
      return '🔄';
    case 'api_call':
      return '🌐';
    case 'page_view':
      return '👁️';
    case 'idle':
      return '😴';
    case 'active':
      return '⚡';
    default:
      return '📝';
  }
}

// 获取活动描述
function getActivityDescription(activity: any): string {
  switch (activity.activityType) {
    case 'login':
      return '用户登录';
    case 'logout':
      return '用户登出';
    case 'refresh':
      return 'Token刷新';
    case 'api_call':
      return `API调用: ${activity.details?.method} ${activity.details?.endpoint}`;
    case 'page_view':
      return `页面访问: ${activity.details?.page}`;
    case 'idle':
      return '进入空闲状态';
    case 'active':
      return '恢复活跃状态';
    default:
      return '未知活动';
  }
}
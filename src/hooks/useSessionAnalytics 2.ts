// 会话分析Hook

import { useState, useEffect, useCallback } from 'react';
import { sessionMonitor, SessionAnalytics, SessionActivity } from '@/lib/session-monitor';
import { useAuth } from './useAuth';

export interface UseSessionAnalyticsReturn {
  // 分析数据
  analytics: SessionAnalytics | null;
  currentSessionStatus: {
    isActive: boolean;
    duration: number;
    lastActivity: number;
    activityCount: number;
  } | null;
  
  // 操作方法
  refreshAnalytics: () => Promise<void>;
  recordPageView: (page: string) => void;
  recordApiCall: (endpoint: string, method: string, statusCode: number, duration: number) => void;
  
  // 状态
  loading: boolean;
  error: string | null;
}

export function useSessionAnalytics(period: 'day' | 'week' | 'month' = 'day'): UseSessionAnalyticsReturn {
  const { user, isAuthenticated } = useAuth();
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null);
  const [currentSessionStatus, setCurrentSessionStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取分析数据
  const fetchAnalytics = useCallback(async () => {
    if (!user || !isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);

      const data = await sessionMonitor.getSessionAnalytics(user.id, period);
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取分析数据失败');
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated, period]);

  // 刷新分析数据
  const refreshAnalytics = useCallback(async () => {
    await fetchAnalytics();
  }, [fetchAnalytics]);

  // 记录页面访问
  const recordPageView = useCallback((page: string) => {
    sessionMonitor.recordPageView(page);
  }, []);

  // 记录API调用
  const recordApiCall = useCallback((
    endpoint: string, 
    method: string, 
    statusCode: number, 
    duration: number
  ) => {
    sessionMonitor.recordApiCall(endpoint, method, statusCode, duration);
  }, []);

  // 更新当前会话状态
  const updateCurrentSessionStatus = useCallback(() => {
    const status = sessionMonitor.getCurrentSessionStatus();
    setCurrentSessionStatus(status);
  }, []);

  // 初始化
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchAnalytics();
    } else {
      setAnalytics(null);
      setCurrentSessionStatus(null);
    }
  }, [isAuthenticated, user, fetchAnalytics]);

  // 定期更新当前会话状态
  useEffect(() => {
    if (!isAuthenticated) return;

    updateCurrentSessionStatus();
    
    const interval = setInterval(updateCurrentSessionStatus, 10000); // 每10秒更新一次
    
    return () => clearInterval(interval);
  }, [isAuthenticated, updateCurrentSessionStatus]);

  // 监听路由变化
  useEffect(() => {
    const handleRouteChange = () => {
      recordPageView(window.location.pathname);
    };

    // 记录初始页面
    if (isAuthenticated) {
      recordPageView(window.location.pathname);
    }

    // 监听路由变化
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [isAuthenticated, recordPageView]);

  return {
    // 分析数据
    analytics,
    currentSessionStatus,
    
    // 操作方法
    refreshAnalytics,
    recordPageView,
    recordApiCall,
    
    // 状态
    loading,
    error,
  };
}

// 会话统计Hook - 用于仪表板显示
export function useSessionStats() {
  const { analytics, loading, error } = useSessionAnalytics('day');
  
  const stats = analytics ? {
    // 基础统计
    totalSessions: analytics.metrics.totalSessions,
    activeSessions: analytics.metrics.activeSessions,
    averageSessionDuration: Math.round(analytics.metrics.averageSessionDuration / 1000 / 60), // 转换为分钟
    
    // API统计
    totalApiCalls: analytics.metrics.totalApiCalls,
    errorRate: Math.round(analytics.metrics.errorRate * 100), // 转换为百分比
    
    // 活动统计
    totalActivities: analytics.activities.length,
    mostActiveHour: analytics.metrics.activityByHour.reduce((max, current) => 
      current.count > max.count ? current : max, { hour: 0, count: 0 }
    ),
    
    // 设备统计
    mostActiveDevice: analytics.metrics.mostActiveDevices[0] || null,
    totalDevices: analytics.metrics.mostActiveDevices.length,
    
    // 页面统计
    mostVisitedPage: analytics.metrics.topPages[0] || null,
    totalPageViews: analytics.metrics.topPages.reduce((sum, page) => sum + page.views, 0),
  } : null;

  return {
    stats,
    loading,
    error,
  };
}

// 实时会话监控Hook
export function useRealtimeSessionMonitor() {
  const { currentSessionStatus, recordApiCall } = useSessionAnalytics();
  const [realtimeStats, setRealtimeStats] = useState({
    apiCallsPerMinute: 0,
    averageResponseTime: 0,
    errorCount: 0,
    lastActivity: null as Date | null,
  });

  // API调用统计
  const [apiCallHistory, setApiCallHistory] = useState<Array<{
    timestamp: number;
    duration: number;
    success: boolean;
  }>>([]);

  // 记录API调用并更新统计
  const recordApiCallWithStats = useCallback((
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number
  ) => {
    recordApiCall(endpoint, method, statusCode, duration);
    
    const now = Date.now();
    const success = statusCode < 400;
    
    setApiCallHistory(prev => {
      const newHistory = [...prev, { timestamp: now, duration, success }];
      
      // 只保留最近5分钟的数据
      const fiveMinutesAgo = now - 5 * 60 * 1000;
      return newHistory.filter(call => call.timestamp > fiveMinutesAgo);
    });
  }, [recordApiCall]);

  // 更新实时统计
  useEffect(() => {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    
    // 计算每分钟API调用数
    const recentCalls = apiCallHistory.filter(call => call.timestamp > oneMinuteAgo);
    const apiCallsPerMinute = recentCalls.length;
    
    // 计算平均响应时间
    const averageResponseTime = recentCalls.length > 0
      ? recentCalls.reduce((sum, call) => sum + call.duration, 0) / recentCalls.length
      : 0;
    
    // 计算错误数量
    const errorCount = recentCalls.filter(call => !call.success).length;
    
    // 最后活动时间
    const lastActivity = currentSessionStatus?.lastActivity 
      ? new Date(currentSessionStatus.lastActivity)
      : null;
    
    setRealtimeStats({
      apiCallsPerMinute,
      averageResponseTime: Math.round(averageResponseTime),
      errorCount,
      lastActivity,
    });
  }, [apiCallHistory, currentSessionStatus]);

  return {
    currentSessionStatus,
    realtimeStats,
    recordApiCall: recordApiCallWithStats,
  };
}
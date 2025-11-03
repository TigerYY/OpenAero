// 安全监控 React Hook

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import { securityMonitor, SecurityEvent, SecurityAlert, RiskAssessment } from '@/lib/security-monitor';

import { useAuth } from './useAuth';

export interface SecurityStats {
  totalEvents: number;
  unreadAlerts: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  recentEvents: SecurityEvent[];
  criticalAlerts: SecurityAlert[];
}

export function useSecurityMonitor() {
  const { user } = useAuth();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<SecurityStats>({
    totalEvents: 0,
    unreadAlerts: 0,
    riskLevel: 'low',
    riskScore: 0,
    recentEvents: [],
    criticalAlerts: [],
  });

  // 加载安全数据
  const loadSecurityData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // 获取安全事件
      const userEvents = securityMonitor.getUserSecurityEvents(user.id);
      setEvents(userEvents);

      // 获取安全警报
      const userAlerts = securityMonitor.getUserSecurityAlerts(user.id);
      setAlerts(userAlerts);

      // 获取风险评估
      const assessment = securityMonitor.getRiskAssessment(user.id);
      setRiskAssessment(assessment);

      // 更新统计信息
      const unreadAlerts = userAlerts.filter(alert => !alert.read);
      const criticalAlerts = userAlerts.filter(alert => 
        alert.severity === 'critical' || alert.severity === 'high'
      );

      setStats({
        totalEvents: userEvents.length,
        unreadAlerts: unreadAlerts.length,
        riskLevel: assessment?.riskLevel || 'low',
        riskScore: assessment?.overallRiskScore || 0,
        recentEvents: userEvents.slice(0, 5),
        criticalAlerts: criticalAlerts.slice(0, 3),
      });

    } catch (error) {
      console.error('加载安全数据失败:', error);
      toast.error('加载安全数据失败');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // 检测可疑登录
  const checkSuspiciousLogin = useCallback(async (
    deviceId: string,
    loginData: {
      ipAddress: string;
      userAgent: string;
      location?: { country?: string; city?: string };
      fingerprint: string;
    }
  ) => {
    if (!user?.id) return null;

    try {
      const result = await securityMonitor.detectSuspiciousLogin(
        user.id,
        deviceId,
        loginData
      );

      if (result.isSuspicious) {
        toast.warning('检测到可疑登录活动', {
          description: result.reasons.join(', '),
        });
      }

      // 刷新数据
      await loadSecurityData();

      return result;
    } catch (error) {
      console.error('检测可疑登录失败:', error);
      toast.error('安全检测失败');
      return null;
    }
  }, [user?.id, loadSecurityData]);

  // 检测暴力破解
  const checkBruteForceAttack = useCallback(async (
    ipAddress: string,
    timeWindow?: number
  ) => {
    if (!user?.id) return false;

    try {
      const isBruteForce = await securityMonitor.detectBruteForceAttack(
        user.id,
        ipAddress,
        timeWindow
      );

      if (isBruteForce) {
        toast.error('检测到暴力破解攻击', {
          description: '您的账户可能受到攻击，请立即采取安全措施',
        });
      }

      // 刷新数据
      await loadSecurityData();

      return isBruteForce;
    } catch (error) {
      console.error('检测暴力破解失败:', error);
      return false;
    }
  }, [user?.id, loadSecurityData]);

  // 更新风险评估
  const updateRiskAssessment = useCallback(async () => {
    if (!user?.id) return null;

    try {
      const assessment = await securityMonitor.updateRiskAssessment(user.id);
      setRiskAssessment(assessment);

      // 刷新数据
      await loadSecurityData();

      return assessment;
    } catch (error) {
      console.error('更新风险评估失败:', error);
      toast.error('更新风险评估失败');
      return null;
    }
  }, [user?.id, loadSecurityData]);

  // 标记警报为已读
  const markAlertAsRead = useCallback(async (alertId: string) => {
    try {
      await securityMonitor.markAlertAsRead(alertId);
      
      // 更新本地状态
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, read: true } : alert
      ));

      // 更新统计
      setStats(prev => ({
        ...prev,
        unreadAlerts: Math.max(0, prev.unreadAlerts - 1),
      }));

      toast.success('警报已标记为已读');
    } catch (error) {
      console.error('标记警报失败:', error);
      toast.error('标记警报失败');
    }
  }, []);

  // 批量标记警报为已读
  const markAllAlertsAsRead = useCallback(async () => {
    const unreadAlerts = alerts.filter(alert => !alert.read);
    
    try {
      await Promise.all(
        unreadAlerts.map(alert => securityMonitor.markAlertAsRead(alert.id))
      );

      // 更新本地状态
      setAlerts(prev => prev.map(alert => ({ ...alert, read: true })));
      setStats(prev => ({ ...prev, unreadAlerts: 0 }));

      toast.success(`已标记 ${unreadAlerts.length} 个警报为已读`);
    } catch (error) {
      console.error('批量标记警报失败:', error);
      toast.error('批量标记警报失败');
    }
  }, [alerts]);

  // 记录安全事件
  const recordSecurityEvent = useCallback(async (
    eventData: {
      deviceId: string;
      eventType: SecurityEvent['eventType'];
      severity: SecurityEvent['severity'];
      description: string;
      details?: {
        ipAddress?: string;
        userAgent?: string;
        location?: {
          country?: string;
          city?: string;
        };
        previousLocation?: {
          country?: string;
          city?: string;
        };
        failureCount?: number;
        timeWindow?: number;
        riskScore?: number;
        indicators?: string[];
      };
    }
  ) => {
    if (!user?.id) return;

    try {
      await securityMonitor.recordSecurityEvent({
        userId: user.id,
        deviceId: eventData.deviceId,
        eventType: eventData.eventType,
        severity: eventData.severity,
        description: eventData.description,
        details: eventData.details || {},
      });

      // 刷新数据
      await loadSecurityData();

      toast.info('安全事件已记录');
    } catch (error) {
      console.error('记录安全事件失败:', error);
      toast.error('记录安全事件失败');
    }
  }, [user?.id, loadSecurityData]);

  // 获取安全建议
  const getSecurityRecommendations = useCallback(() => {
    if (!riskAssessment) return [];

    const recommendations = [...riskAssessment.recommendations];

    // 根据未读警报添加建议
    if (stats.unreadAlerts > 0) {
      recommendations.unshift('查看并处理未读安全警报');
    }

    // 根据风险等级添加建议
    if (stats.riskLevel === 'critical') {
      recommendations.unshift('立即联系安全团队');
    } else if (stats.riskLevel === 'high') {
      recommendations.unshift('尽快采取安全措施');
    }

    return recommendations;
  }, [riskAssessment, stats]);

  // 获取风险等级颜色
  const getRiskLevelColor = useCallback((level: string) => {
    switch (level) {
      case 'low':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'high':
        return 'text-orange-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }, []);

  // 获取风险等级背景色
  const getRiskLevelBgColor = useCallback((level: string) => {
    switch (level) {
      case 'low':
        return 'bg-green-100';
      case 'medium':
        return 'bg-yellow-100';
      case 'high':
        return 'bg-orange-100';
      case 'critical':
        return 'bg-red-100';
      default:
        return 'bg-gray-100';
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    if (user?.id) {
      loadSecurityData();
    }
  }, [user?.id, loadSecurityData]);

  // 定期刷新数据
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      loadSecurityData();
    }, 5 * 60 * 1000); // 每5分钟刷新一次

    return () => clearInterval(interval);
  }, [user?.id, loadSecurityData]);

  return {
    // 数据
    events,
    alerts,
    riskAssessment,
    stats,
    loading,

    // 方法
    loadSecurityData,
    checkSuspiciousLogin,
    checkBruteForceAttack,
    updateRiskAssessment,
    markAlertAsRead,
    markAllAlertsAsRead,
    recordSecurityEvent,
    getSecurityRecommendations,
    getRiskLevelColor,
    getRiskLevelBgColor,

    // 计算属性
    hasUnreadAlerts: stats.unreadAlerts > 0,
    hasCriticalAlerts: stats.criticalAlerts.length > 0,
    isHighRisk: stats.riskLevel === 'high' || stats.riskLevel === 'critical',
  };
}

// 安全监控仪表板 Hook
export function useSecurityDashboard() {
  const securityMonitor = useSecurityMonitor();
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  // 获取时间范围内的事件
  const getEventsInTimeRange = useCallback(() => {
    const now = Date.now();
    let timeWindow: number;

    switch (timeRange) {
      case '24h':
        timeWindow = 24 * 60 * 60 * 1000;
        break;
      case '7d':
        timeWindow = 7 * 24 * 60 * 60 * 1000;
        break;
      case '30d':
        timeWindow = 30 * 24 * 60 * 60 * 1000;
        break;
    }

    return securityMonitor.events.filter(event =>
      now - new Date(event.timestamp).getTime() <= timeWindow
    );
  }, [securityMonitor.events, timeRange]);

  // 获取事件统计
  const getEventStats = useCallback(() => {
    const events = getEventsInTimeRange();
    
    const stats = {
      total: events.length,
      suspicious: events.filter(e => e.eventType === 'suspicious_login').length,
      bruteForce: events.filter(e => e.eventType === 'brute_force').length,
      deviceChanges: events.filter(e => e.eventType === 'device_change').length,
      locationChanges: events.filter(e => e.eventType === 'unusual_location').length,
    };

    return stats;
  }, [getEventsInTimeRange]);

  return {
    ...securityMonitor,
    timeRange,
    setTimeRange,
    eventsInTimeRange: getEventsInTimeRange(),
    eventStats: getEventStats(),
  };
}
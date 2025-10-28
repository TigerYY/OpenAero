// 会话监控和分析系统

export interface SessionActivity {
  id: string;
  userId: string;
  sessionId: string;
  deviceId: string;
  activityType: 'login' | 'logout' | 'refresh' | 'api_call' | 'page_view' | 'idle' | 'active';
  details?: {
    endpoint?: string;
    method?: string;
    statusCode?: number;
    duration?: number;
    page?: string;
    userAgent?: string;
    ipAddress?: string;
  };
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SessionMetrics {
  totalSessions: number;
  activeSessions: number;
  averageSessionDuration: number;
  totalApiCalls: number;
  errorRate: number;
  mostActiveDevices: Array<{
    deviceId: string;
    deviceName: string;
    activityCount: number;
  }>;
  activityByHour: Array<{
    hour: number;
    count: number;
  }>;
  topPages: Array<{
    page: string;
    views: number;
  }>;
  geographicDistribution: Array<{
    country: string;
    count: number;
  }>;
}

export interface SessionAnalytics {
  userId: string;
  period: 'day' | 'week' | 'month';
  startDate: string;
  endDate: string;
  metrics: SessionMetrics;
  activities: SessionActivity[];
}

export class SessionMonitor {
  private static instance: SessionMonitor;
  private activities: SessionActivity[] = [];
  private currentSession: {
    sessionId: string;
    userId: string;
    deviceId: string;
    startTime: number;
    lastActivity: number;
  } | null = null;
  private activityBuffer: SessionActivity[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private pageStartTime: number = Date.now();
  private idleTimer: NodeJS.Timeout | null = null;
  private isIdle: boolean = false;

  static getInstance(): SessionMonitor {
    if (!SessionMonitor.instance) {
      SessionMonitor.instance = new SessionMonitor();
    }
    return SessionMonitor.instance;
  }

  constructor() {
    this.setupEventListeners();
    this.startPeriodicFlush();
  }

  // 开始会话监控
  startSession(userId: string, sessionId: string, deviceId: string): void {
    this.currentSession = {
      sessionId,
      userId,
      deviceId,
      startTime: Date.now(),
      lastActivity: Date.now(),
    };

    this.recordActivity({
      activityType: 'login',
      details: {
        userAgent: navigator.userAgent,
      },
    });

    console.log('会话监控已启动:', { userId, sessionId, deviceId });
  }

  // 结束会话监控
  endSession(): void {
    if (this.currentSession) {
      this.recordActivity({
        activityType: 'logout',
        details: {
          duration: Date.now() - this.currentSession.startTime,
        },
      });

      this.flushActivities();
      this.currentSession = null;
    }

    this.cleanup();
  }

  // 记录活动
  recordActivity(activity: Omit<SessionActivity, 'id' | 'userId' | 'sessionId' | 'deviceId' | 'timestamp'>): void {
    if (!this.currentSession) return;

    const fullActivity: SessionActivity = {
      id: this.generateId(),
      userId: this.currentSession.userId,
      sessionId: this.currentSession.sessionId,
      deviceId: this.currentSession.deviceId,
      timestamp: new Date().toISOString(),
      ...activity,
    };

    this.activityBuffer.push(fullActivity);
    this.currentSession.lastActivity = Date.now();

    // 如果缓冲区满了，立即刷新
    if (this.activityBuffer.length >= 50) {
      this.flushActivities();
    }
  }

  // 记录API调用
  recordApiCall(endpoint: string, method: string, statusCode: number, duration: number): void {
    this.recordActivity({
      activityType: 'api_call',
      details: {
        endpoint,
        method,
        statusCode,
        duration,
      },
    });
  }

  // 记录页面访问
  recordPageView(page: string): void {
    // 记录上一个页面的停留时间
    if (this.pageStartTime) {
      const duration = Date.now() - this.pageStartTime;
      this.recordActivity({
        activityType: 'page_view',
        details: {
          page: document.location.pathname,
          duration,
        },
      });
    }

    // 开始新页面计时
    this.pageStartTime = Date.now();
    
    this.recordActivity({
      activityType: 'page_view',
      details: {
        page,
      },
    });
  }

  // 记录token刷新
  recordTokenRefresh(): void {
    this.recordActivity({
      activityType: 'refresh',
    });
  }

  // 获取会话分析
  async getSessionAnalytics(
    userId: string, 
    period: 'day' | 'week' | 'month' = 'day'
  ): Promise<SessionAnalytics> {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
    }

    try {
      const response = await fetch(`/api/auth/analytics?userId=${userId}&start=${startDate.toISOString()}&end=${endDate.toISOString()}`);
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('获取会话分析失败:', error);
    }

    // 从本地数据生成分析
    return this.generateLocalAnalytics(userId, period, startDate, endDate);
  }

  // 获取实时会话状态
  getCurrentSessionStatus(): {
    isActive: boolean;
    duration: number;
    lastActivity: number;
    activityCount: number;
  } | null {
    if (!this.currentSession) return null;

    return {
      isActive: !this.isIdle,
      duration: Date.now() - this.currentSession.startTime,
      lastActivity: this.currentSession.lastActivity,
      activityCount: this.activityBuffer.length + this.activities.length,
    };
  }

  // 设置事件监听器
  private setupEventListeners(): void {
    // 页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.recordActivity({ activityType: 'idle' });
        this.setIdle(true);
      } else {
        this.recordActivity({ activityType: 'active' });
        this.setIdle(false);
      }
    });

    // 用户活动检测
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const handleActivity = this.throttle(() => {
      if (this.isIdle) {
        this.recordActivity({ activityType: 'active' });
        this.setIdle(false);
      }
      this.resetIdleTimer();
    }, 1000);

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // 页面卸载
    window.addEventListener('beforeunload', () => {
      this.flushActivities();
    });

    // 路由变化（如果使用客户端路由）
    window.addEventListener('popstate', () => {
      this.recordPageView(window.location.pathname);
    });
  }

  // 设置空闲状态
  private setIdle(idle: boolean): void {
    this.isIdle = idle;
    if (idle) {
      this.clearIdleTimer();
    } else {
      this.resetIdleTimer();
    }
  }

  // 重置空闲计时器
  private resetIdleTimer(): void {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      this.recordActivity({ activityType: 'idle' });
      this.setIdle(true);
    }, 5 * 60 * 1000); // 5分钟无活动视为空闲
  }

  // 清除空闲计时器
  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  // 开始定期刷新
  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flushActivities();
    }, 30000); // 每30秒刷新一次
  }

  // 刷新活动到服务器
  private async flushActivities(): Promise<void> {
    if (this.activityBuffer.length === 0) return;

    const activitiesToFlush = [...this.activityBuffer];
    this.activityBuffer = [];

    try {
      await fetch('/api/auth/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activities: activitiesToFlush }),
      });

      // 保存到本地缓存
      this.activities.push(...activitiesToFlush);
      
      // 限制本地缓存大小
      if (this.activities.length > 1000) {
        this.activities = this.activities.slice(-1000);
      }
    } catch (error) {
      console.error('刷新活动失败:', error);
      // 失败时重新加入缓冲区
      this.activityBuffer.unshift(...activitiesToFlush);
    }
  }

  // 生成本地分析
  private generateLocalAnalytics(
    userId: string, 
    period: 'day' | 'week' | 'month',
    startDate: Date,
    endDate: Date
  ): SessionAnalytics {
    const userActivities = this.activities.filter(activity => 
      activity.userId === userId &&
      new Date(activity.timestamp) >= startDate &&
      new Date(activity.timestamp) <= endDate
    );

    // 计算会话
    const sessions = new Set(userActivities.map(a => a.sessionId));
    const activeSessions = new Set(
      userActivities
        .filter(a => Date.now() - new Date(a.timestamp).getTime() < 30 * 60 * 1000) // 30分钟内活跃
        .map(a => a.sessionId)
    );

    // 计算平均会话时长
    const sessionDurations = Array.from(sessions).map(sessionId => {
      const sessionActivities = userActivities.filter(a => a.sessionId === sessionId);
      if (sessionActivities.length < 2) return 0;
      
      const start = Math.min(...sessionActivities.map(a => new Date(a.timestamp).getTime()));
      const end = Math.max(...sessionActivities.map(a => new Date(a.timestamp).getTime()));
      return end - start;
    });

    const averageSessionDuration = sessionDurations.length > 0 
      ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length 
      : 0;

    // API调用统计
    const apiCalls = userActivities.filter(a => a.activityType === 'api_call');
    const errorCalls = apiCalls.filter(a => a.details?.statusCode && a.details.statusCode >= 400);

    // 设备活动统计
    const deviceActivity = new Map<string, number>();
    userActivities.forEach(activity => {
      const count = deviceActivity.get(activity.deviceId) || 0;
      deviceActivity.set(activity.deviceId, count + 1);
    });

    // 按小时统计
    const hourlyActivity = new Array(24).fill(0);
    userActivities.forEach(activity => {
      const hour = new Date(activity.timestamp).getHours();
      hourlyActivity[hour]++;
    });

    // 页面访问统计
    const pageViews = new Map<string, number>();
    userActivities
      .filter(a => a.activityType === 'page_view' && a.details?.page)
      .forEach(activity => {
        const page = activity.details!.page!;
        const count = pageViews.get(page) || 0;
        pageViews.set(page, count + 1);
      });

    const metrics: SessionMetrics = {
      totalSessions: sessions.size,
      activeSessions: activeSessions.size,
      averageSessionDuration,
      totalApiCalls: apiCalls.length,
      errorRate: apiCalls.length > 0 ? errorCalls.length / apiCalls.length : 0,
      mostActiveDevices: Array.from(deviceActivity.entries())
        .map(([deviceId, count]) => ({
          deviceId,
          deviceName: `Device ${deviceId.slice(-8)}`,
          activityCount: count,
        }))
        .sort((a, b) => b.activityCount - a.activityCount)
        .slice(0, 5),
      activityByHour: hourlyActivity.map((count, hour) => ({ hour, count })),
      topPages: Array.from(pageViews.entries())
        .map(([page, views]) => ({ page, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10),
      geographicDistribution: [], // 需要从IP地址解析
    };

    return {
      userId,
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      metrics,
      activities: userActivities.slice(-100), // 返回最近100条活动
    };
  }

  // 清理资源
  private cleanup(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.clearIdleTimer();
  }

  // 工具方法
  private generateId(): string {
    return `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private throttle<T extends (...args: any[]) => any>(func: T, limit: number): T {
    let inThrottle: boolean;
    return ((...args: any[]) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }) as T;
  }
}

export const sessionMonitor = SessionMonitor.getInstance();
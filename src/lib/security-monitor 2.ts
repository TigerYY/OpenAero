// 安全监控系统

export interface SecurityEvent {
  id: string;
  userId: string;
  deviceId: string;
  eventType: 'suspicious_login' | 'multiple_failures' | 'unusual_location' | 'device_change' | 'session_hijack' | 'brute_force' | 'account_takeover';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: {
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
  timestamp: string;
  resolved: boolean;
  actions: string[];
}

export interface SecurityAlert {
  id: string;
  userId: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'device' | 'location' | 'behavior' | 'system';
  timestamp: string;
  read: boolean;
  actionRequired: boolean;
  recommendedActions: string[];
}

export interface RiskAssessment {
  userId: string;
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: Array<{
    factor: string;
    score: number;
    weight: number;
    description: string;
  }>;
  recommendations: string[];
  lastUpdated: string;
}

export interface SecurityConfig {
  maxFailedAttempts: number;
  lockoutDuration: number; // 分钟
  suspiciousLocationThreshold: number; // 公里
  deviceTrustDecayDays: number;
  riskScoreThresholds: {
    low: number;
    medium: number;
    high: number;
  };
  alertSettings: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
  };
}

export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private events: SecurityEvent[] = [];
  private alerts: SecurityAlert[] = [];
  private riskAssessments: Map<string, RiskAssessment> = new Map();
  private config: SecurityConfig = {
    maxFailedAttempts: 5,
    lockoutDuration: 30,
    suspiciousLocationThreshold: 100,
    deviceTrustDecayDays: 90,
    riskScoreThresholds: {
      low: 30,
      medium: 60,
      high: 80,
    },
    alertSettings: {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
    },
  };

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  // 记录安全事件
  async recordSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved' | 'actions'>): Promise<void> {
    const securityEvent: SecurityEvent = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      resolved: false,
      actions: [],
      ...event,
    };

    this.events.push(securityEvent);

    // 根据事件严重程度自动处理
    await this.handleSecurityEvent(securityEvent);

    // 更新风险评估
    await this.updateRiskAssessment(event.userId);

    // 保存到服务器
    try {
      await this.saveSecurityEventToServer(securityEvent);
    } catch (error) {
      console.error('保存安全事件失败:', error);
    }
  }

  // 创建安全警报
  async createSecurityAlert(alert: Omit<SecurityAlert, 'id' | 'timestamp' | 'read'>): Promise<void> {
    const securityAlert: SecurityAlert = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      read: false,
      ...alert,
    };

    this.alerts.push(securityAlert);

    // 发送通知
    await this.sendNotification(securityAlert);

    // 保存到服务器
    try {
      await this.saveSecurityAlertToServer(securityAlert);
    } catch (error) {
      console.error('保存安全警报失败:', error);
    }
  }

  // 检测可疑登录
  async detectSuspiciousLogin(
    userId: string,
    deviceId: string,
    loginData: {
      ipAddress: string;
      userAgent: string;
      location?: { country?: string; city?: string };
      fingerprint: string;
    }
  ): Promise<{
    isSuspicious: boolean;
    reasons: string[];
    riskScore: number;
    recommendedActions: string[];
  }> {
    const reasons: string[] = [];
    let riskScore = 0;
    const recommendedActions: string[] = [];

    // 获取用户历史登录数据
    const userEvents = this.events.filter(event => event.userId === userId);
    const recentLogins = userEvents
      .filter(event => event.eventType === 'suspicious_login' || event.details.ipAddress)
      .slice(-10);

    // 检查IP地址变化
    if (recentLogins.length > 0) {
      const lastLogin = recentLogins[recentLogins.length - 1];
      if (lastLogin?.details?.ipAddress && lastLogin.details.ipAddress !== loginData.ipAddress) {
        reasons.push('IP地址发生变化');
        riskScore += 25;
      }
    }

    // 检查地理位置变化
    if (loginData.location && recentLogins.length > 0) {
      const lastLocation = recentLogins[recentLogins.length - 1]?.details?.location;
      if (lastLocation && lastLocation.country !== loginData.location.country) {
        reasons.push('登录地理位置异常');
        riskScore += 40;
        
        // 计算距离（简化版）
        if (lastLocation.city && loginData.location.city && 
            lastLocation.city !== loginData.location.city) {
          reasons.push('登录城市发生变化');
          riskScore += 20;
        }
      }
    }

    // 检查设备指纹变化
    const deviceEvents = userEvents.filter(event => event.deviceId === deviceId);
    if (deviceEvents.length > 0) {
      // 这里应该检查设备指纹，但需要从设备管理器获取
      // 暂时跳过
    }

    // 检查登录时间模式
    const now = new Date();
    const hour = now.getHours();
    const userLoginHours = recentLogins.map(login => new Date(login.timestamp).getHours());
    
    if (userLoginHours.length > 0) {
      const averageHour = userLoginHours.reduce((a, b) => a + b, 0) / userLoginHours.length;
      const hourDifference = Math.abs(hour - averageHour);
      
      if (hourDifference > 6) {
        reasons.push('登录时间异常');
        riskScore += 15;
      }
    }

    // 检查失败尝试
    const recentFailures = userEvents
      .filter(event => 
        event.eventType === 'multiple_failures' &&
        Date.now() - new Date(event.timestamp).getTime() < 3600000 // 1小时内
      );

    if (recentFailures.length > 0) {
      reasons.push('近期存在登录失败记录');
      riskScore += 30;
    }

    // 生成建议
    if (riskScore >= this.config.riskScoreThresholds.high) {
      recommendedActions.push('要求额外身份验证');
      recommendedActions.push('发送安全警报通知');
      recommendedActions.push('临时限制账户功能');
    } else if (riskScore >= this.config.riskScoreThresholds.medium) {
      recommendedActions.push('发送登录通知');
      recommendedActions.push('建议用户验证设备');
    }

    const isSuspicious = riskScore >= this.config.riskScoreThresholds.medium;

    // 记录可疑登录事件
    if (isSuspicious) {
      await this.recordSecurityEvent({
        userId,
        deviceId,
        eventType: 'suspicious_login',
        severity: riskScore >= this.config.riskScoreThresholds.high ? 'high' : 'medium',
        description: `检测到可疑登录活动: ${reasons.join(', ')}`,
        details: {
          ipAddress: loginData.ipAddress,
          userAgent: loginData.userAgent,
          location: loginData.location,
          riskScore,
          indicators: reasons,
        },
      });
    }

    return {
      isSuspicious,
      reasons,
      riskScore,
      recommendedActions,
    };
  }

  // 检测暴力破解攻击
  async detectBruteForceAttack(
    userId: string,
    ipAddress: string,
    timeWindow: number = 3600000 // 1小时
  ): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - timeWindow;

    // 统计时间窗口内的失败尝试
    const failedAttempts = this.events.filter(event =>
      event.userId === userId &&
      event.details.ipAddress === ipAddress &&
      new Date(event.timestamp).getTime() >= windowStart &&
      (event.eventType === 'multiple_failures' || event.details.failureCount)
    );

    const totalFailures = failedAttempts.reduce((sum, event) => 
      sum + (event.details.failureCount || 1), 0
    );

    if (totalFailures >= this.config.maxFailedAttempts) {
      await this.recordSecurityEvent({
        userId,
        deviceId: 'unknown',
        eventType: 'brute_force',
        severity: 'high',
        description: `检测到暴力破解攻击，${timeWindow / 60000}分钟内失败${totalFailures}次`,
        details: {
          ipAddress,
          failureCount: totalFailures,
          timeWindow,
        },
      });

      return true;
    }

    return false;
  }

  // 更新风险评估
  async updateRiskAssessment(userId: string): Promise<RiskAssessment> {
    const userEvents = this.events.filter(event => event.userId === userId);
    const recentEvents = userEvents.filter(event =>
      Date.now() - new Date(event.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000 // 7天内
    );

    const factors = [];
    let totalScore = 0;

    // 分析各种风险因素
    
    // 1. 登录失败频率
    const failureEvents = recentEvents.filter(event => 
      event.eventType === 'multiple_failures' || event.eventType === 'brute_force'
    );
    const failureScore = Math.min(failureEvents.length * 10, 40);
    factors.push({
      factor: '登录失败频率',
      score: failureScore,
      weight: 0.3,
      description: `近7天内${failureEvents.length}次登录失败事件`,
    });

    // 2. 可疑活动
    const suspiciousEvents = recentEvents.filter(event => 
      event.eventType === 'suspicious_login' || event.eventType === 'unusual_location'
    );
    const suspiciousScore = Math.min(suspiciousEvents.length * 15, 50);
    factors.push({
      factor: '可疑活动',
      score: suspiciousScore,
      weight: 0.4,
      description: `近7天内${suspiciousEvents.length}次可疑活动`,
    });

    // 3. 设备变化频率
    const deviceChanges = new Set(recentEvents.map(event => event.deviceId)).size;
    const deviceScore = Math.min(deviceChanges * 5, 30);
    factors.push({
      factor: '设备变化',
      score: deviceScore,
      weight: 0.2,
      description: `近7天内使用${deviceChanges}个不同设备`,
    });

    // 4. 地理位置变化
    const locations = recentEvents
      .filter(event => event.details.location)
      .map(event => event.details.location!.country)
      .filter((country, index, arr) => arr.indexOf(country) === index);
    const locationScore = Math.min(locations.length * 8, 25);
    factors.push({
      factor: '地理位置变化',
      score: locationScore,
      weight: 0.1,
      description: `近7天内从${locations.length}个不同国家登录`,
    });

    // 计算加权总分
    totalScore = factors.reduce((sum, factor) => 
      sum + (factor.score * factor.weight), 0
    );

    // 确定风险等级
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (totalScore >= this.config.riskScoreThresholds.high) {
      riskLevel = 'critical';
    } else if (totalScore >= this.config.riskScoreThresholds.medium) {
      riskLevel = 'high';
    } else if (totalScore >= this.config.riskScoreThresholds.low) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    // 生成建议
    const recommendations = [];
    if (riskLevel === 'critical') {
      recommendations.push('立即更改密码');
      recommendations.push('启用双因素认证');
      recommendations.push('撤销所有设备会话');
      recommendations.push('联系安全团队');
    } else if (riskLevel === 'high') {
      recommendations.push('考虑更改密码');
      recommendations.push('检查账户活动');
      recommendations.push('启用双因素认证');
    } else if (riskLevel === 'medium') {
      recommendations.push('定期检查账户活动');
      recommendations.push('确保设备安全');
    }

    const assessment: RiskAssessment = {
      userId,
      overallRiskScore: Math.round(totalScore),
      riskLevel,
      factors,
      recommendations,
      lastUpdated: new Date().toISOString(),
    };

    this.riskAssessments.set(userId, assessment);

    // 如果风险等级较高，创建警报
    if (riskLevel === 'high' || riskLevel === 'critical') {
      await this.createSecurityAlert({
        userId,
        title: '账户安全风险警报',
        message: `您的账户风险等级为${riskLevel}，建议立即采取安全措施`,
        severity: riskLevel === 'critical' ? 'critical' : 'high',
        category: 'authentication',
        actionRequired: true,
        recommendedActions: recommendations,
      });
    }

    return assessment;
  }

  // 获取用户安全事件
  getUserSecurityEvents(userId: string, limit: number = 50): SecurityEvent[] {
    return this.events
      .filter(event => event.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // 获取用户安全警报
  getUserSecurityAlerts(userId: string, unreadOnly: boolean = false): SecurityAlert[] {
    return this.alerts
      .filter(alert => alert.userId === userId && (!unreadOnly || !alert.read))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // 获取风险评估
  getRiskAssessment(userId: string): RiskAssessment | null {
    return this.riskAssessments.get(userId) || null;
  }

  // 标记警报为已读
  async markAlertAsRead(alertId: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.read = true;
      
      try {
        await this.updateSecurityAlertOnServer(alert);
      } catch (error) {
        console.error('更新警报状态失败:', error);
      }
    }
  }

  // 处理安全事件
  private async handleSecurityEvent(event: SecurityEvent): Promise<void> {
    const actions = [];

    switch (event.eventType) {
      case 'brute_force':
        actions.push('临时锁定账户');
        actions.push('发送安全警报');
        break;
      
      case 'suspicious_login':
        if (event.severity === 'high') {
          actions.push('要求额外验证');
          actions.push('发送登录通知');
        }
        break;
      
      case 'unusual_location':
        actions.push('发送位置变化通知');
        break;
    }

    event.actions = actions;

    // 执行自动化响应
    for (const action of actions) {
      await this.executeSecurityAction(event.userId, action, event);
    }
  }

  // 执行安全动作
  private async executeSecurityAction(
    userId: string, 
    action: string, 
    event: SecurityEvent
  ): Promise<void> {
    switch (action) {
      case '发送安全警报':
        await this.createSecurityAlert({
          userId,
          title: '安全事件警报',
          message: event.description,
          severity: event.severity,
          category: 'authentication',
          actionRequired: event.severity === 'high' || event.severity === 'critical',
          recommendedActions: ['检查账户活动', '更改密码', '联系支持团队'],
        });
        break;
      
      case '发送登录通知':
        await this.createSecurityAlert({
          userId,
          title: '新设备登录通知',
          message: `检测到从新位置或设备的登录活动`,
          severity: 'medium',
          category: 'device',
          actionRequired: false,
          recommendedActions: ['验证是否为本人操作'],
        });
        break;
    }
  }

  // 发送通知
  private async sendNotification(alert: SecurityAlert): Promise<void> {
    if (!this.config.alertSettings.pushNotifications) return;

    // 这里应该集成实际的通知服务
    console.log('发送安全警报通知:', alert);
    
    // 可以集成推送通知、邮件、短信等
    try {
      await fetch('/api/notifications/security', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alert),
      });
    } catch (error) {
      console.error('发送通知失败:', error);
    }
  }

  // 服务器交互方法
  private async saveSecurityEventToServer(event: SecurityEvent): Promise<void> {
    await fetch('/api/security/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });
  }

  private async saveSecurityAlertToServer(alert: SecurityAlert): Promise<void> {
    await fetch('/api/security/alerts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(alert),
    });
  }

  private async updateSecurityAlertOnServer(alert: SecurityAlert): Promise<void> {
    await fetch(`/api/security/alerts/${alert.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(alert),
    });
  }

  // 工具方法
  private generateId(): string {
    return `security_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const securityMonitor = SecurityMonitor.getInstance();
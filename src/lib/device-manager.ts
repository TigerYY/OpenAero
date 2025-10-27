// 设备管理和多设备登录支持

export interface DeviceInfo {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  os: string;
  ipAddress: string;
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
  fingerprint: string;
  isActive: boolean;
  isTrusted: boolean;
  lastActiveAt: string;
  createdAt: string;
  sessionId?: string;
}

export interface DeviceSession {
  deviceId: string;
  sessionId: string;
  token: string;
  refreshToken: string;
  expiresAt: string;
  isActive: boolean;
}

export interface LoginAttempt {
  id: string;
  userId?: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  reason?: string;
  timestamp: string;
  location?: {
    country?: string;
    city?: string;
  };
}

export class DeviceManager {
  private static instance: DeviceManager;
  private devices: Map<string, DeviceInfo> = new Map();
  private sessions: Map<string, DeviceSession> = new Map();
  private loginAttempts: LoginAttempt[] = [];

  static getInstance(): DeviceManager {
    if (!DeviceManager.instance) {
      DeviceManager.instance = new DeviceManager();
    }
    return DeviceManager.instance;
  }

  // 生成设备指纹
  async generateDeviceFingerprint(): Promise<string> {
    const components = [];

    // 基本浏览器信息
    components.push(navigator.userAgent);
    components.push(navigator.language);
    components.push(navigator.platform);
    components.push(navigator.cookieEnabled.toString());

    // 屏幕信息
    components.push(`${screen.width}x${screen.height}`);
    components.push(screen.colorDepth.toString());
    components.push(screen.pixelDepth.toString());

    // 时区信息
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

    // Canvas指纹
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device fingerprint', 2, 2);
        components.push(canvas.toDataURL());
      }
    } catch (e) {
      // Canvas可能被禁用
    }

    // WebGL指纹
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') as WebGLRenderingContext | null || 
                 canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
          components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
        }
      }
    } catch (e) {
      // WebGL可能不支持
    }

    // 音频指纹
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 1000;
      gainNode.gain.value = 0;
      
      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(frequencyData);
      
      components.push(Array.from(frequencyData).join(','));
      
      oscillator.disconnect();
      analyser.disconnect();
      gainNode.disconnect();
    } catch (e) {
      // 音频API可能不支持
    }

    // 生成哈希
    const fingerprint = await this.hashString(components.join('|'));
    return fingerprint;
  }

  // 获取设备信息
  async getDeviceInfo(): Promise<Partial<DeviceInfo>> {
    const userAgent = navigator.userAgent;
    const fingerprint = await this.generateDeviceFingerprint();

    // 解析设备类型
    const deviceType = this.detectDeviceType(userAgent);
    
    // 解析浏览器
    const browser = this.detectBrowser(userAgent);
    
    // 解析操作系统
    const os = this.detectOS(userAgent);

    return {
      deviceType,
      browser,
      os,
      fingerprint,
    };
  }

  // 注册新设备
  async registerDevice(userId: string, deviceInfo: Partial<DeviceInfo>): Promise<DeviceInfo> {
    const deviceId = this.generateDeviceId();
    const now = new Date().toISOString();

    const device: DeviceInfo = {
      id: this.generateId(),
      userId,
      deviceId,
      deviceName: this.generateDeviceName(deviceInfo.deviceType, deviceInfo.browser),
      deviceType: deviceInfo.deviceType || 'unknown',
      browser: deviceInfo.browser || 'Unknown',
      os: deviceInfo.os || 'Unknown',
      ipAddress: deviceInfo.ipAddress || '',
      location: deviceInfo.location,
      fingerprint: deviceInfo.fingerprint || '',
      isActive: true,
      isTrusted: false, // 新设备默认不受信任
      lastActiveAt: now,
      createdAt: now,
    };

    this.devices.set(deviceId, device);

    // 保存到服务器
    try {
      await this.saveDeviceToServer(device);
    } catch (error) {
      console.error('保存设备信息失败:', error);
    }

    return device;
  }

  // 验证设备
  async verifyDevice(deviceId: string, fingerprint: string): Promise<boolean> {
    const device = this.devices.get(deviceId);
    if (!device) {
      return false;
    }

    // 检查指纹是否匹配
    if (device.fingerprint !== fingerprint) {
      console.warn('设备指纹不匹配:', { deviceId, expected: device.fingerprint, actual: fingerprint });
      return false;
    }

    // 更新最后活跃时间
    device.lastActiveAt = new Date().toISOString();
    this.devices.set(deviceId, device);

    return true;
  }

  // 获取用户的所有设备
  async getUserDevices(userId: string): Promise<DeviceInfo[]> {
    try {
      const response = await fetch(`/api/auth/devices?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        return data.devices || [];
      }
    } catch (error) {
      console.error('获取用户设备失败:', error);
    }

    // 从本地缓存获取
    return Array.from(this.devices.values()).filter(device => device.userId === userId);
  }

  // 创建设备会话
  async createDeviceSession(deviceId: string, sessionData: Omit<DeviceSession, 'deviceId'>): Promise<void> {
    const session: DeviceSession = {
      deviceId,
      ...sessionData,
    };

    this.sessions.set(deviceId, session);

    // 保存到服务器
    try {
      await this.saveSessionToServer(session);
    } catch (error) {
      console.error('保存设备会话失败:', error);
    }
  }

  // 移除设备会话
  async removeDeviceSession(deviceId: string): Promise<void> {
    this.sessions.delete(deviceId);

    try {
      await fetch(`/api/auth/sessions/${deviceId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('删除设备会话失败:', error);
    }
  }

  // 信任设备
  async trustDevice(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (device) {
      device.isTrusted = true;
      this.devices.set(deviceId, device);

      try {
        await this.updateDeviceOnServer(device);
      } catch (error) {
        console.error('更新设备信任状态失败:', error);
      }
    }
  }

  // 撤销设备
  async revokeDevice(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (device) {
      device.isActive = false;
      this.devices.set(deviceId, device);

      // 移除会话
      await this.removeDeviceSession(deviceId);

      try {
        await this.updateDeviceOnServer(device);
      } catch (error) {
        console.error('撤销设备失败:', error);
      }
    }
  }

  // 记录登录尝试
  async recordLoginAttempt(attempt: Omit<LoginAttempt, 'id' | 'timestamp'>): Promise<void> {
    const loginAttempt: LoginAttempt = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      ...attempt,
    };

    this.loginAttempts.push(loginAttempt);

    // 只保留最近1000条记录
    if (this.loginAttempts.length > 1000) {
      this.loginAttempts = this.loginAttempts.slice(-1000);
    }

    try {
      await this.saveLoginAttemptToServer(loginAttempt);
    } catch (error) {
      console.error('保存登录尝试记录失败:', error);
    }
  }

  // 检测异常登录
  async detectAnomalousLogin(userId: string, deviceInfo: Partial<DeviceInfo>): Promise<{
    isAnomalous: boolean;
    reasons: string[];
    riskScore: number;
  }> {
    const reasons: string[] = [];
    let riskScore = 0;

    // 获取用户历史设备
    const userDevices = await this.getUserDevices(userId);
    const recentAttempts = this.loginAttempts
      .filter(attempt => attempt.userId === userId)
      .slice(-10); // 最近10次尝试

    // 检查是否为新设备
    const isNewDevice = !userDevices.some(device => 
      device.fingerprint === deviceInfo.fingerprint
    );

    if (isNewDevice) {
      reasons.push('新设备登录');
      riskScore += 30;
    }

    // 检查IP地址变化
    if (recentAttempts.length > 0) {
      const lastSuccessfulAttempt = recentAttempts
        .reverse()
        .find(attempt => attempt.success);

      if (lastSuccessfulAttempt && 
          lastSuccessfulAttempt.ipAddress !== deviceInfo.ipAddress) {
        reasons.push('IP地址变化');
        riskScore += 20;
      }
    }

    // 检查地理位置变化
    if (deviceInfo.location && userDevices.length > 0) {
      const hasLocationChange = !userDevices.some(device => 
        device.location?.country === deviceInfo.location?.country
      );

      if (hasLocationChange) {
        reasons.push('地理位置异常');
        riskScore += 40;
      }
    }

    // 检查登录频率
    const recentFailedAttempts = this.loginAttempts
      .filter(attempt => 
        attempt.userId === userId && 
        !attempt.success &&
        Date.now() - new Date(attempt.timestamp).getTime() < 3600000 // 1小时内
      );

    if (recentFailedAttempts.length >= 3) {
      reasons.push('频繁登录失败');
      riskScore += 25;
    }

    return {
      isAnomalous: riskScore >= 50,
      reasons,
      riskScore,
    };
  }

  // 私有方法
  private detectDeviceType(userAgent: string): DeviceInfo['deviceType'] {
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      if (/iPad/.test(userAgent)) return 'tablet';
      return 'mobile';
    }
    return 'desktop';
  }

  private detectBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private detectOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateDeviceName(deviceType?: string, browser?: string): string {
    const type = deviceType || 'Unknown';
    const browserName = browser || 'Unknown';
    return `${type} - ${browserName}`;
  }

  private async hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async saveDeviceToServer(device: DeviceInfo): Promise<void> {
    await fetch('/api/auth/devices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(device),
    });
  }

  private async updateDeviceOnServer(device: DeviceInfo): Promise<void> {
    await fetch(`/api/auth/devices/${device.deviceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(device),
    });
  }

  private async saveSessionToServer(session: DeviceSession): Promise<void> {
    await fetch('/api/auth/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(session),
    });
  }

  private async saveLoginAttemptToServer(attempt: LoginAttempt): Promise<void> {
    await fetch('/api/auth/login-attempts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(attempt),
    });
  }
}

export const deviceManager = DeviceManager.getInstance();
// 设备管理Hook

import { useState, useEffect, useCallback } from 'react';
import { deviceManager, DeviceInfo, LoginAttempt } from '@/lib/device-manager';
import { useAuth } from './useAuth';

export interface UseDeviceManagerReturn {
  // 设备信息
  currentDevice: DeviceInfo | null;
  userDevices: DeviceInfo[];
  isDeviceRegistered: boolean;
  isDeviceTrusted: boolean;
  
  // 设备管理
  registerCurrentDevice: () => Promise<DeviceInfo | null>;
  trustCurrentDevice: () => Promise<void>;
  revokeDevice: (deviceId: string) => Promise<void>;
  refreshDevices: () => Promise<void>;
  
  // 安全检查
  checkDeviceSecurity: () => Promise<{
    isSecure: boolean;
    warnings: string[];
    recommendations: string[];
  }>;
  
  // 异常检测
  detectAnomalousActivity: () => Promise<{
    isAnomalous: boolean;
    reasons: string[];
    riskScore: number;
  }>;
  
  // 状态
  loading: boolean;
  error: string | null;
}

export function useDeviceManager(): UseDeviceManagerReturn {
  const { user, isAuthenticated } = useAuth();
  const [currentDevice, setCurrentDevice] = useState<DeviceInfo | null>(null);
  const [userDevices, setUserDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 初始化设备信息
  const initializeDevice = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      setLoading(true);
      setError(null);

      // 获取当前设备信息
      const deviceInfo = await deviceManager.getDeviceInfo();
      
      // 检查设备是否已注册
      const devices = await deviceManager.getUserDevices(user.id);
      const existingDevice = devices.find(device => 
        device.fingerprint === deviceInfo.fingerprint
      );

      if (existingDevice) {
        // 验证设备
        const isValid = await deviceManager.verifyDevice(
          existingDevice.deviceId, 
          deviceInfo.fingerprint || ''
        );

        if (isValid) {
          setCurrentDevice(existingDevice);
        } else {
          setError('设备验证失败，请重新登录');
        }
      } else {
        // 新设备，需要注册
        setCurrentDevice(null);
      }

      setUserDevices(devices);
    } catch (err) {
      setError(err instanceof Error ? err.message : '初始化设备失败');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // 注册当前设备
  const registerCurrentDevice = useCallback(async (): Promise<DeviceInfo | null> => {
    if (!user) return null;

    try {
      setLoading(true);
      setError(null);

      const deviceInfo = await deviceManager.getDeviceInfo();
      
      // 获取IP地址和位置信息
      const ipInfo = await getIPInfo();
      
      const newDevice = await deviceManager.registerDevice(user.id, {
        ...deviceInfo,
        ipAddress: ipInfo.ip,
        location: ipInfo.location,
      });

      // 记录登录尝试
      await deviceManager.recordLoginAttempt({
        userId: user.id,
        deviceId: newDevice.deviceId,
        ipAddress: ipInfo.ip,
        userAgent: navigator.userAgent,
        success: true,
        location: ipInfo.location,
      });

      setCurrentDevice(newDevice);
      await refreshDevices();

      return newDevice;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '注册设备失败';
      setError(errorMessage);
      
      // 记录失败的登录尝试
      if (user) {
        try {
          const ipInfo = await getIPInfo();
          await deviceManager.recordLoginAttempt({
            userId: user.id,
            deviceId: 'unknown',
            ipAddress: ipInfo.ip,
            userAgent: navigator.userAgent,
            success: false,
            reason: errorMessage,
            location: ipInfo.location,
          });
        } catch (recordError) {
          console.error('记录登录尝试失败:', recordError);
        }
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 信任当前设备
  const trustCurrentDevice = useCallback(async () => {
    if (!currentDevice) return;

    try {
      setLoading(true);
      setError(null);

      await deviceManager.trustDevice(currentDevice.deviceId);
      
      // 更新本地状态
      const updatedDevice = { ...currentDevice, isTrusted: true };
      setCurrentDevice(updatedDevice);
      
      // 更新设备列表
      setUserDevices(prev => 
        prev.map(device => 
          device.deviceId === currentDevice.deviceId 
            ? updatedDevice 
            : device
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '信任设备失败');
    } finally {
      setLoading(false);
    }
  }, [currentDevice]);

  // 撤销设备
  const revokeDevice = useCallback(async (deviceId: string) => {
    try {
      setLoading(true);
      setError(null);

      await deviceManager.revokeDevice(deviceId);
      
      // 如果撤销的是当前设备，清除状态
      if (currentDevice?.deviceId === deviceId) {
        setCurrentDevice(null);
      }
      
      // 更新设备列表
      setUserDevices(prev => 
        prev.map(device => 
          device.deviceId === deviceId 
            ? { ...device, isActive: false }
            : device
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '撤销设备失败');
    } finally {
      setLoading(false);
    }
  }, [currentDevice]);

  // 刷新设备列表
  const refreshDevices = useCallback(async () => {
    if (!user) return;

    try {
      const devices = await deviceManager.getUserDevices(user.id);
      setUserDevices(devices);
    } catch (err) {
      console.error('刷新设备列表失败:', err);
    }
  }, [user]);

  // 检查设备安全性
  const checkDeviceSecurity = useCallback(async () => {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // 检查是否为受信任设备
    if (currentDevice && !currentDevice.isTrusted) {
      warnings.push('当前设备未受信任');
      recommendations.push('建议将常用设备设置为受信任设备');
    }

    // 检查设备数量
    const activeDevices = userDevices.filter(device => device.isActive);
    if (activeDevices.length > 5) {
      warnings.push('活跃设备数量过多');
      recommendations.push('建议撤销不再使用的设备');
    }

    // 检查设备活跃时间
    const oldDevices = userDevices.filter(device => {
      const lastActive = new Date(device.lastActiveAt);
      const daysSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceActive > 30 && device.isActive;
    });

    if (oldDevices.length > 0) {
      warnings.push(`${oldDevices.length}个设备超过30天未活跃`);
      recommendations.push('建议撤销长期未使用的设备');
    }

    return {
      isSecure: warnings.length === 0,
      warnings,
      recommendations,
    };
  }, [currentDevice, userDevices]);

  // 检测异常活动
  const detectAnomalousActivity = useCallback(async () => {
    if (!user || !currentDevice) {
      return {
        isAnomalous: false,
        reasons: [],
        riskScore: 0,
      };
    }

    try {
      const deviceInfo = await deviceManager.getDeviceInfo();
      const ipInfo = await getIPInfo();
      
      return await deviceManager.detectAnomalousLogin(user.id, {
        ...deviceInfo,
        ipAddress: ipInfo.ip,
        location: ipInfo.location,
      });
    } catch (err) {
      console.error('异常检测失败:', err);
      return {
        isAnomalous: false,
        reasons: [],
        riskScore: 0,
      };
    }
  }, [user, currentDevice]);

  // 计算派生状态
  const isDeviceRegistered = currentDevice !== null;
  const isDeviceTrusted = currentDevice?.isTrusted || false;

  // 初始化
  useEffect(() => {
    initializeDevice();
  }, [initializeDevice]);

  // 监听认证状态变化
  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentDevice(null);
      setUserDevices([]);
      setError(null);
    }
  }, [isAuthenticated]);

  return {
    // 设备信息
    currentDevice,
    userDevices,
    isDeviceRegistered,
    isDeviceTrusted,
    
    // 设备管理
    registerCurrentDevice,
    trustCurrentDevice,
    revokeDevice,
    refreshDevices,
    
    // 安全检查
    checkDeviceSecurity,
    detectAnomalousActivity,
    
    // 状态
    loading,
    error,
  };
}

// 获取IP和位置信息的辅助函数
async function getIPInfo(): Promise<{
  ip: string;
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
}> {
  try {
    // 尝试从多个服务获取IP信息
    const services = [
      'https://ipapi.co/json/',
      'https://ip-api.com/json/',
      'https://ipinfo.io/json',
    ];

    for (const service of services) {
      try {
        const response = await fetch(service);
        if (response.ok) {
          const data = await response.json();
          
          return {
            ip: data.ip || data.query || 'unknown',
            location: {
              country: data.country || data.country_name,
              city: data.city,
              region: data.region || data.regionName,
            },
          };
        }
      } catch (serviceError) {
        console.warn(`IP服务 ${service} 失败:`, serviceError);
        continue;
      }
    }

    // 如果所有服务都失败，返回默认值
    return {
      ip: 'unknown',
      location: undefined,
    };
  } catch (err) {
    console.error('获取IP信息失败:', err);
    return {
      ip: 'unknown',
      location: undefined,
    };
  }
}
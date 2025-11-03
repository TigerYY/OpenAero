// 设备管理组件

'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';

import { useDeviceManager } from '@/hooks/useDeviceManager';
import { DeviceInfo } from '@/lib/device-manager';

interface DeviceManagementProps {
  className?: string;
}

export function DeviceManagement({ className = '' }: DeviceManagementProps) {
  const {
    currentDevice,
    userDevices,
    isDeviceRegistered,
    isDeviceTrusted,
    registerCurrentDevice,
    trustCurrentDevice,
    revokeDevice,
    refreshDevices,
    checkDeviceSecurity,
    detectAnomalousActivity,
    loading,
    error,
  } = useDeviceManager();

  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null);
  const [showSecurityCheck, setShowSecurityCheck] = useState(false);
  const [securityReport, setSecurityReport] = useState<any>(null);

  // 注册当前设备
  const handleRegisterDevice = async () => {
    try {
      const device = await registerCurrentDevice();
      if (device) {
        toast.success('设备注册成功');
      }
    } catch (err) {
      toast.error('设备注册失败');
    }
  };

  // 信任设备
  const handleTrustDevice = async () => {
    try {
      await trustCurrentDevice();
      toast.success('设备已设置为受信任');
    } catch (err) {
      toast.error('设置信任失败');
    }
  };

  // 撤销设备
  const handleRevokeDevice = async (deviceId: string, deviceName: string) => {
    if (!confirm(`确定要撤销设备 "${deviceName}" 吗？此操作将终止该设备上的所有会话。`)) {
      return;
    }

    try {
      await revokeDevice(deviceId);
      toast.success('设备已撤销');
    } catch (err) {
      toast.error('撤销设备失败');
    }
  };

  // 安全检查
  const handleSecurityCheck = async () => {
    try {
      const [securityResult, anomalyResult] = await Promise.all([
        checkDeviceSecurity(),
        detectAnomalousActivity(),
      ]);

      setSecurityReport({
        security: securityResult,
        anomaly: anomalyResult,
      });
      setShowSecurityCheck(true);
    } catch (err) {
      toast.error('安全检查失败');
    }
  };

  // 设备图标
  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return '📱';
      case 'tablet':
        return '📱';
      case 'desktop':
        return '💻';
      default:
        return '🖥️';
    }
  };

  // 设备状态标签
  const getDeviceStatusBadge = (device: DeviceInfo) => {
    if (!device.isActive) {
      return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">已撤销</span>;
    }
    if (device.isTrusted) {
      return <span className="px-2 py-1 text-xs bg-green-100 text-green-600 rounded">受信任</span>;
    }
    return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-600 rounded">未信任</span>;
  };

  // 格式化时间
  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleString('zh-CN');
  };

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <h3 className="text-lg font-semibold text-red-800 mb-2">设备管理错误</h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={refreshDevices}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 当前设备状态 */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">当前设备</h3>
        
        {!isDeviceRegistered ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🔒</div>
            <h4 className="text-xl font-medium mb-2">设备未注册</h4>
            <p className="text-gray-600 mb-4">
              为了您的账户安全，请注册当前设备
            </p>
            <button
              onClick={handleRegisterDevice}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '注册中...' : '注册设备'}
            </button>
          </div>
        ) : currentDevice ? (
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="text-3xl">{getDeviceIcon(currentDevice.deviceType)}</div>
              <div>
                <h4 className="font-medium">{currentDevice.deviceName}</h4>
                <p className="text-sm text-gray-600">
                  {currentDevice.browser} • {currentDevice.os}
                </p>
                <p className="text-sm text-gray-500">
                  最后活跃: {formatTime(currentDevice.lastActiveAt)}
                </p>
                <div className="mt-2">
                  {getDeviceStatusBadge(currentDevice)}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              {!isDeviceTrusted && (
                <button
                  onClick={handleTrustDevice}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  设为受信任
                </button>
              )}
              <button
                onClick={handleSecurityCheck}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                安全检查
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* 设备列表 */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">所有设备</h3>
          <button
            onClick={refreshDevices}
            disabled={loading}
            className="px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50 disabled:opacity-50"
          >
            刷新
          </button>
        </div>

        {userDevices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            暂无设备记录
          </div>
        ) : (
          <div className="space-y-4">
            {userDevices.map((device) => (
              <div
                key={device.deviceId}
                className={`p-4 border rounded-lg ${
                  device.deviceId === currentDevice?.deviceId
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="text-2xl">{getDeviceIcon(device.deviceType)}</div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{device.deviceName}</h4>
                        {device.deviceId === currentDevice?.deviceId && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded">
                            当前设备
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {device.browser} • {device.os}
                      </p>
                      <p className="text-sm text-gray-500">
                        IP: {device.ipAddress}
                        {device.location && (
                          <span> • {device.location.city}, {device.location.country}</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        注册时间: {formatTime(device.createdAt)}
                      </p>
                      <p className="text-sm text-gray-500">
                        最后活跃: {formatTime(device.lastActiveAt)}
                      </p>
                      <div className="mt-2">
                        {getDeviceStatusBadge(device)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedDevice(device)}
                      className="px-3 py-1 text-sm text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
                    >
                      详情
                    </button>
                    {device.isActive && device.deviceId !== currentDevice?.deviceId && (
                      <button
                        onClick={() => handleRevokeDevice(device.deviceId, device.deviceName)}
                        className="px-3 py-1 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50"
                      >
                        撤销
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 设备详情模态框 */}
      {selectedDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">设备详情</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">设备名称</label>
                <p className="text-sm text-gray-900">{selectedDevice.deviceName}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">设备类型</label>
                <p className="text-sm text-gray-900">{selectedDevice.deviceType}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">浏览器</label>
                <p className="text-sm text-gray-900">{selectedDevice.browser}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">操作系统</label>
                <p className="text-sm text-gray-900">{selectedDevice.os}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">IP地址</label>
                <p className="text-sm text-gray-900">{selectedDevice.ipAddress}</p>
              </div>
              
              {selectedDevice.location && (
                <div>
                  <label className="text-sm font-medium text-gray-700">位置</label>
                  <p className="text-sm text-gray-900">
                    {selectedDevice.location.city}, {selectedDevice.location.country}
                  </p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-700">设备指纹</label>
                <p className="text-sm text-gray-900 font-mono break-all">
                  {selectedDevice.fingerprint.substring(0, 32)}...
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">注册时间</label>
                <p className="text-sm text-gray-900">{formatTime(selectedDevice.createdAt)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">最后活跃</label>
                <p className="text-sm text-gray-900">{formatTime(selectedDevice.lastActiveAt)}</p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setSelectedDevice(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 安全检查报告模态框 */}
      {showSecurityCheck && securityReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">安全检查报告</h3>
            
            {/* 安全状态 */}
            <div className="mb-6">
              <div className={`p-4 rounded-lg ${
                securityReport.security.isSecure 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">
                    {securityReport.security.isSecure ? '✅' : '⚠️'}
                  </span>
                  <h4 className="font-medium">
                    {securityReport.security.isSecure ? '安全状态良好' : '发现安全问题'}
                  </h4>
                </div>
              </div>
            </div>

            {/* 警告信息 */}
            {securityReport.security.warnings.length > 0 && (
              <div className="mb-4">
                <h5 className="font-medium text-yellow-800 mb-2">安全警告</h5>
                <ul className="space-y-1">
                  {securityReport.security.warnings.map((warning: string, index: number) => (
                    <li key={index} className="text-sm text-yellow-700 flex items-start">
                      <span className="mr-2">•</span>
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 建议 */}
            {securityReport.security.recommendations.length > 0 && (
              <div className="mb-4">
                <h5 className="font-medium text-blue-800 mb-2">安全建议</h5>
                <ul className="space-y-1">
                  {securityReport.security.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="text-sm text-blue-700 flex items-start">
                      <span className="mr-2">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 异常检测 */}
            {securityReport.anomaly.isAnomalous && (
              <div className="mb-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h5 className="font-medium text-red-800 mb-2">
                    检测到异常活动 (风险评分: {securityReport.anomaly.riskScore})
                  </h5>
                  <ul className="space-y-1">
                    {securityReport.anomaly.reasons.map((reason: string, index: number) => (
                      <li key={index} className="text-sm text-red-700 flex items-start">
                        <span className="mr-2">•</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowSecurityCheck(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
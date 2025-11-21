// 安全仪表板组件

'use client';

import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Eye, 
  Clock, 
  MapPin, 
  Smartphone,
  TrendingUp,
  CheckCircle,
  XCircle,
  Info,
  RefreshCw
} from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { Card, LoadingSpinner } from '@/components/layout/AppLayout';


export function SecurityDashboard() {
  // 简化版本，移除了用户安全监控功能
  const stats = {
    riskLevel: 'low',
    riskScore: 10,
    unreadAlerts: 0,
    recentEvents: []
  };
  const loading = false;
  const timeRange = '24h';
  const events = [];
  const alerts = [];
  const riskAssessment = null;
  const eventStats = {
    total: 0,
    suspicious: 0,
    bruteForce: 0,
    deviceChanges: 0
  };

  const setTimeRange = () => {};
  const eventsInTimeRange = [];
  const loadSecurityData = async () => {};
  const markAlertAsRead = () => {};
  const markAllAlertsAsRead = () => {};
  const updateRiskAssessment = async () => {};
  const getSecurityRecommendations = () => [];
  const getRiskLevelColor = () => 'text-green-600';
  const getRiskLevelBgColor = () => 'bg-green-100';
  const hasUnreadAlerts = false;
  const hasCriticalAlerts = false;
  const isHighRisk = false;

  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);

  // 刷新数据
  const handleRefresh = async () => {
    await loadSecurityData();
    toast.success('安全数据已刷新');
  };

  // 更新风险评估
  const handleUpdateRiskAssessment = async () => {
    await updateRiskAssessment();
    toast.success('风险评估已更新');
  };

  // 查看事件详情
  const handleViewEventDetails = (event: any) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  // 获取事件类型图标
  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'suspicious_login':
        return <Eye className="w-4 h-4" />;
      case 'brute_force':
        return <AlertTriangle className="w-4 h-4" />;
      case 'unusual_location':
        return <MapPin className="w-4 h-4" />;
      case 'device_change':
        return <Smartphone className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  // 获取严重程度颜色
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">安全仪表板</h1>
          <p className="text-gray-600">监控账户安全状态和活动</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* 时间范围选择 */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="24h">最近24小时</option>
            <option value="7d">最近7天</option>
            <option value="30d">最近30天</option>
          </select>
          
          <button
            onClick={handleRefresh}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </button>
        </div>
      </div>

      {/* 安全状态概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 风险等级 */}
        <Card className="p-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${getRiskLevelBgColor(stats.riskLevel)}`}>
              <Shield className={`w-6 h-6 ${getRiskLevelColor(stats.riskLevel)}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">风险等级</p>
              <p className={`text-lg font-semibold ${getRiskLevelColor(stats.riskLevel)}`}>
                {stats.riskLevel.toUpperCase()}
              </p>
              <p className="text-xs text-gray-500">评分: {stats.riskScore}/100</p>
            </div>
          </div>
        </Card>

        {/* 未读警报 */}
        <Card className="p-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${hasUnreadAlerts ? 'bg-red-100' : 'bg-green-100'}`}>
              <AlertTriangle className={`w-6 h-6 ${hasUnreadAlerts ? 'text-red-600' : 'text-green-600'}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">未读警报</p>
              <p className="text-2xl font-bold text-gray-900">{stats.unreadAlerts}</p>
              {hasCriticalAlerts && (
                <p className="text-xs text-red-600">包含紧急警报</p>
              )}
            </div>
          </div>
        </Card>

        {/* 安全事件 */}
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">安全事件</p>
              <p className="text-2xl font-bold text-gray-900">{eventStats.total}</p>
              <p className="text-xs text-gray-500">{timeRange} 内</p>
            </div>
          </div>
        </Card>

        {/* 最近活动 */}
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">最近活动</p>
              <p className="text-2xl font-bold text-gray-900">{stats.recentEvents.length}</p>
              <p className="text-xs text-gray-500">最近事件</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 风险评估和建议 */}
      {riskAssessment && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 风险因素分析 */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">风险因素分析</h3>
              <button
                onClick={handleUpdateRiskAssessment}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                更新评估
              </button>
            </div>
            <div className="space-y-4">
              {riskAssessment.factors.map((factor, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{factor.factor}</p>
                    <p className="text-xs text-gray-500">{factor.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          factor.score >= 30 ? 'bg-red-500' : 
                          factor.score >= 15 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(factor.score * 2, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{factor.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 安全建议 */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">安全建议</h3>
            <div className="space-y-3">
              {getSecurityRecommendations().map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{recommendation}</p>
                </div>
              ))}
              {getSecurityRecommendations().length === 0 && (
                <div className="flex items-center space-x-3 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <p className="text-sm">您的账户安全状态良好</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* 安全警报 */}
      {alerts.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">安全警报</h3>
            {hasUnreadAlerts && (
              <button
                onClick={markAllAlertsAsRead}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                全部标记为已读
              </button>
            )}
          </div>
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${
                  alert.read ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      {!alert.read && (
                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      )}
                    </div>
                    <h4 className="text-sm font-medium text-gray-900 mt-2">{alert.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {!alert.read && (
                    <button
                      onClick={() => markAlertAsRead(alert.id)}
                      className="text-sm text-blue-600 hover:text-blue-800 ml-4"
                    >
                      标记已读
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 安全事件列表 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">最近安全事件</h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>可疑登录: {eventStats.suspicious}</span>
            <span>暴力破解: {eventStats.bruteForce}</span>
            <span>设备变化: {eventStats.deviceChanges}</span>
          </div>
        </div>
        
        {eventsInTimeRange.length > 0 ? (
          <div className="space-y-3">
            {eventsInTimeRange.slice(0, 10).map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                onClick={() => handleViewEventDetails(event)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${getSeverityColor(event.severity)}`}>
                    {getEventTypeIcon(event.eventType)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{event.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(event.severity)}`}>
                    {event.severity.toUpperCase()}
                  </span>
                  {event.resolved ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无安全事件</p>
          </div>
        )}
      </Card>

      {/* 事件详情模态框 */}
      {showEventDetails && selectedEvent && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto border shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">事件详情</h3>
              <button
                onClick={() => setShowEventDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">事件类型</label>
                <p className="text-sm text-gray-900">{selectedEvent.eventType}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">严重程度</label>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(selectedEvent.severity)}`}>
                  {selectedEvent.severity.toUpperCase()}
                </span>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">描述</label>
                <p className="text-sm text-gray-900">{selectedEvent.description}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">时间</label>
                <p className="text-sm text-gray-900">{new Date(selectedEvent.timestamp).toLocaleString()}</p>
              </div>
              
              {selectedEvent.details && (
                <div>
                  <label className="text-sm font-medium text-gray-600">详细信息</label>
                  <pre className="text-xs text-gray-900 bg-gray-100 p-3 rounded-md overflow-x-auto">
                    {JSON.stringify(selectedEvent.details, null, 2)}
                  </pre>
                </div>
              )}
              
              {selectedEvent.actions && selectedEvent.actions.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-600">已执行操作</label>
                  <ul className="text-sm text-gray-900 list-disc list-inside">
                    {selectedEvent.actions.map((action: string, index: number) => (
                      <li key={index}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
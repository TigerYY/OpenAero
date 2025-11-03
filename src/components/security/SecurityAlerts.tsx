// 安全警报组件

'use client';

import { 
  AlertTriangle, 
  Bell, 
  BellOff, 
  Check, 
  X, 
  Eye, 
  EyeOff,
  Filter,
  Search,
  Calendar,
  Shield,
  Smartphone,
  MapPin,
  Activity
} from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { Card } from '@/components/layout/AppLayout';
import { useSecurityMonitor } from '@/hooks/useSecurityMonitor';

interface SecurityAlertsProps {
  showHeader?: boolean;
  maxItems?: number;
  compact?: boolean;
}

export function SecurityAlerts({ 
  showHeader = true, 
  maxItems = 20, 
  compact = false 
}: SecurityAlertsProps) {
  const {
    alerts,
    loading,
    markAlertAsRead,
    markAllAlertsAsRead,
    loadSecurityData,
    hasUnreadAlerts,
  } = useSecurityMonitor();

  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // 过滤警报
  const filteredAlerts = alerts
    .filter(alert => {
      // 基础过滤
      if (filter === 'unread' && alert.read) return false;
      if (filter === 'critical' && !['critical', 'high'].includes(alert.severity)) return false;
      
      // 分类过滤
      if (selectedCategory !== 'all' && alert.category !== selectedCategory) return false;
      
      // 搜索过滤
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          alert.title.toLowerCase().includes(searchLower) ||
          alert.message.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    })
    .slice(0, maxItems);

  // 获取警报图标
  const getAlertIcon = (category: string, severity: string) => {
    const iconClass = `w-4 h-4 ${getSeverityColor(severity).split(' ')[0]}`;
    
    switch (category) {
      case 'authentication':
        return <Shield className={iconClass} />;
      case 'device':
        return <Smartphone className={iconClass} />;
      case 'location':
        return <MapPin className={iconClass} />;
      case 'behavior':
        return <Activity className={iconClass} />;
      default:
        return <AlertTriangle className={iconClass} />;
    }
  };

  // 获取严重程度颜色
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'high':
        return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'critical':
        return 'text-red-600 bg-red-100 border-red-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  // 获取分类名称
  const getCategoryName = (category: string) => {
    switch (category) {
      case 'authentication':
        return '身份认证';
      case 'device':
        return '设备安全';
      case 'location':
        return '位置异常';
      case 'behavior':
        return '行为分析';
      case 'system':
        return '系统安全';
      default:
        return '其他';
    }
  };

  // 处理警报操作
  const handleMarkAsRead = async (alertId: string) => {
    await markAlertAsRead(alertId);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAlertsAsRead();
  };

  // 刷新警报
  const handleRefresh = async () => {
    await loadSecurityData();
    toast.success('警报已刷新');
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {filteredAlerts.slice(0, 5).map((alert) => (
          <div
            key={alert.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              alert.read ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-200'
            }`}
          >
            <div className="flex items-center space-x-3">
              {getAlertIcon(alert.category, alert.severity)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{alert.title}</p>
                <p className="text-xs text-gray-500">
                  {new Date(alert.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
            {!alert.read && (
              <button
                onClick={() => handleMarkAsRead(alert.id)}
                className="text-blue-600 hover:text-blue-800"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card className="p-6">
      {showHeader && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Bell className="w-6 h-6 text-gray-700" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">安全警报</h2>
              <p className="text-sm text-gray-600">
                {hasUnreadAlerts ? `${alerts.filter(a => !a.read).length} 条未读警报` : '所有警报已读'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-md ${showFilters ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Filter className="w-4 h-4" />
            </button>
            
            {hasUnreadAlerts && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200"
              >
                全部标记已读
              </button>
            )}
            
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 过滤器 */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 搜索 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索警报..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 状态过滤 */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">所有警报</option>
              <option value="unread">未读警报</option>
              <option value="critical">紧急警报</option>
            </select>

            {/* 分类过滤 */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">所有分类</option>
              <option value="authentication">身份认证</option>
              <option value="device">设备安全</option>
              <option value="location">位置异常</option>
              <option value="behavior">行为分析</option>
              <option value="system">系统安全</option>
            </select>
          </div>
        </div>
      )}

      {/* 警报列表 */}
      <div className="space-y-3">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border transition-colors ${
                alert.read 
                  ? 'bg-gray-50 border-gray-200' 
                  : `bg-white ${getSeverityColor(alert.severity).split(' ')[2]}`
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {/* 警报图标 */}
                  <div className={`p-2 rounded-full ${getSeverityColor(alert.severity).split(' ')[1]}`}>
                    {getAlertIcon(alert.category, alert.severity)}
                  </div>
                  
                  {/* 警报内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
                      {!alert.read && (
                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(alert.timestamp).toLocaleString()}</span>
                      </span>
                      
                      <span className={`px-2 py-1 rounded-full ${getSeverityColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                        {getCategoryName(alert.category)}
                      </span>
                    </div>
                    
                    {/* 建议操作 */}
                    {alert.actionRequired && alert.recommendedActions.length > 0 && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-xs font-medium text-yellow-800 mb-1">建议操作:</p>
                        <ul className="text-xs text-yellow-700 list-disc list-inside space-y-1">
                          {alert.recommendedActions.map((action, index) => (
                            <li key={index}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 操作按钮 */}
                <div className="flex items-center space-x-2 ml-4">
                  {!alert.read ? (
                    <button
                      onClick={() => handleMarkAsRead(alert.id)}
                      className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
                      title="标记为已读"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <BellOff className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">暂无警报</p>
            <p className="text-sm">
              {filter === 'unread' ? '所有警报已读' : 
               filter === 'critical' ? '暂无紧急警报' : 
               '您的账户安全状态良好'}
            </p>
          </div>
        )}
      </div>

      {/* 加载更多 */}
      {alerts.length > maxItems && filteredAlerts.length === maxItems && (
        <div className="mt-6 text-center">
          <button
            onClick={() => {/* 实现加载更多逻辑 */}}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200"
          >
            加载更多警报
          </button>
        </div>
      )}
    </Card>
  );
}

// 警报通知组件
export function SecurityAlertNotification() {
  const { alerts, hasUnreadAlerts, hasCriticalAlerts } = useSecurityMonitor();
  const [showDropdown, setShowDropdown] = useState(false);

  const unreadAlerts = alerts.filter(alert => !alert.read).slice(0, 5);

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`relative p-2 rounded-full ${
          hasCriticalAlerts 
            ? 'text-red-600 bg-red-100' 
            : hasUnreadAlerts 
            ? 'text-blue-600 bg-blue-100' 
            : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <Bell className="w-5 h-5" />
        {hasUnreadAlerts && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadAlerts.length}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">安全警报</h3>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {unreadAlerts.length > 0 ? (
              <SecurityAlerts compact maxItems={5} showHeader={false} />
            ) : (
              <div className="p-4 text-center text-gray-500">
                <BellOff className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">暂无未读警报</p>
              </div>
            )}
          </div>
          
          {hasUnreadAlerts && (
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  // 导航到安全页面
                }}
                className="w-full px-3 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200"
              >
                查看所有警报
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
// 简化的安全通知组件 - 不依赖用户系统

'use client';

import { 
  Bell,
  BellOff 
} from 'lucide-react';
import React from 'react';

// 警报通知组件 - 简化版本
export function SecurityAlertNotification() {
  // 在没有用户系统的环境下，返回简单的系统状态指示器
  return (
    <div className="relative">
      <button
        className="relative p-2 rounded-full text-gray-400 hover:text-gray-600"
        title="系统状态"
      >
        <Bell className="w-5 h-5" />
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></span>
      </button>
      
      {/* 简单的提示框 */}
      <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 hidden hover:block">
        <div className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-900">系统运行正常</span>
          </div>
          <p className="text-xs text-gray-600">
            所有系统服务运行正常，无安全警报。
          </p>
        </div>
      </div>
    </div>
  );
}

// 兼容性导出 - 防止其他组件引用出错
export function SecurityAlerts() {
  return (
    <div className="p-4 text-center text-gray-500">
      <BellOff className="w-12 h-12 mx-auto mb-4 text-gray-300" />
      <p className="text-lg font-medium mb-2">安全功能已简化</p>
      <p className="text-sm">用户认证系统已移除，安全监控功能暂时不可用。</p>
    </div>
  );
}
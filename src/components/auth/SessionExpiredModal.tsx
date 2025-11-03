'use client';

import { AlertTriangle, RefreshCw, LogIn } from 'lucide-react';
import React, { useState } from 'react';

interface SessionExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onLogin: () => void;
  autoRefreshAttempts?: number;
}

export function SessionExpiredModal({ 
  isOpen, 
  onClose, 
  onRefresh, 
  onLogin,
  autoRefreshAttempts = 0 
}: SessionExpiredModalProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await onRefresh();
      onClose();
    } catch (error) {
      console.error('刷新会话失败:', error);
      // 如果刷新失败，显示登录选项
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogin = () => {
    onClose();
    onLogin();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center mb-4">
          <AlertTriangle className="h-6 w-6 text-amber-500 mr-3" />
          <h2 className="text-lg font-semibold text-gray-900">
            会话已过期
          </h2>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-2">
            您的登录会话已过期，请选择以下操作：
          </p>
          
          {autoRefreshAttempts > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
              <p className="text-sm text-amber-700">
                已尝试自动刷新 {autoRefreshAttempts} 次，但未成功。
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  刷新中...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  刷新会话
                </>
              )}
            </button>
            
            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              <LogIn className="h-4 w-4 mr-2" />
              重新登录
            </button>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 text-center">
          为了保护您的账户安全，会话会在一定时间后自动过期。
        </div>
      </div>
    </div>
  );
}
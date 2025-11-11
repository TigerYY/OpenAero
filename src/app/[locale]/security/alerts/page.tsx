// 安全警报页面

import { Metadata } from 'next';

import { SecurityAlertNotification } from '@/components/security/SecurityAlerts';

export const metadata: Metadata = {
  title: '安全警报 | OpenAero',
  description: '查看和管理安全警报',
};

export default function AlertsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">安全警报</h1>
          <p className="text-gray-600 mt-2">系统安全状态良好</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <SecurityAlertNotification />
            <p className="text-gray-600 mt-4">当前没有安全警报</p>
          </div>
        </div>
      </div>
    </div>
  );
}
// 安全警报页面

import { Metadata } from 'next';
import { SecurityAlerts } from '@/components/security/SecurityAlerts';
import { AuthGuard } from '@/components/auth/AuthGuard';

export const metadata: Metadata = {
  title: '安全警报 | OpenAero',
  description: '查看和管理安全警报',
};

export default function AlertsPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">安全警报</h1>
            <p className="text-gray-600 mt-2">查看和管理您的安全警报</p>
          </div>
          <SecurityAlerts />
        </div>
      </div>
    </AuthGuard>
  );
}
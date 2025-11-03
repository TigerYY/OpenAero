// 设备管理页面

import { Metadata } from 'next';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { DeviceManagement } from '@/components/auth/DeviceManagement';

export const metadata: Metadata = {
  title: '设备管理 | OpenAero',
  description: '管理您的登录设备和安全设置',
};

export default function DevicesPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">设备管理</h1>
            <p className="text-gray-600 mt-2">管理您的登录设备和安全设置</p>
          </div>
          <DeviceManagement />
        </div>
      </div>
    </AuthGuard>
  );
}
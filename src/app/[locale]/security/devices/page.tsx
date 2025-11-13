// 设备管理页面

import { Metadata } from 'next';

import { DefaultLayout } from '@/components/layout/DefaultLayout';

export const metadata: Metadata = {
  title: '设备管理 | OpenAero',
  description: '管理您的登录设备和安全设置',
};

export default function DevicesPage() {
  return (
    <DefaultLayout>
      <div className="bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">设备管理</h1>
            <p className="text-gray-600 mt-2">系统设备管理功能</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <p className="text-gray-600">设备管理功能暂时不可用</p>
            </div>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}
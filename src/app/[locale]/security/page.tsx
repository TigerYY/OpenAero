// 安全仪表板页面

import { Metadata } from 'next';

import { SecurityDashboard } from '@/components/security/SecurityDashboard';

export const metadata: Metadata = {
  title: '安全仪表板 | OpenAero',
  description: '监控账户安全状态和活动',
};

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <SecurityDashboard />
      </div>
    </div>
  );
}
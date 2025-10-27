// 会话分析页面

import { Metadata } from 'next';
import { SessionAnalyticsDashboard } from '@/components/auth/SessionAnalyticsDashboard';
import { AuthGuard } from '@/components/auth/AuthGuard';

export const metadata: Metadata = {
  title: '会话分析 | OpenAero',
  description: '查看会话统计和分析数据',
};

export default function AnalyticsPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">会话分析</h1>
            <p className="text-gray-600 mt-2">查看您的会话统计和分析数据</p>
          </div>
          <SessionAnalyticsDashboard />
        </div>
      </div>
    </AuthGuard>
  );
}
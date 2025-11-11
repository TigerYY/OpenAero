// 会话分析页面

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '会话分析 | OpenAero',
  description: '查看会话统计和分析数据',
};

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">会话分析</h1>
          <p className="text-gray-600 mt-2">系统分析功能</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <p className="text-gray-600">分析功能暂时不可用</p>
          </div>
        </div>
      </div>
    </div>
  );
}
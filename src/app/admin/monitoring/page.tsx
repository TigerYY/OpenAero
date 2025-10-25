import { MonitoringDashboard } from '@/components/admin/MonitoringDashboard';
import { MainLayout } from '@/components/layout/MainLayout';

// 强制动态渲染
export const dynamic = 'force-dynamic';

export default function MonitoringPage() {
  return (
    <MainLayout locale="zh-CN">
      <div className="min-h-screen bg-gray-50">
        <div className="container py-8">
          <MonitoringDashboard />
        </div>
      </div>
    </MainLayout>
  );
}

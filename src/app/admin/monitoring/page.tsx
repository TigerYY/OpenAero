import { MonitoringDashboard } from '@/components/admin/MonitoringDashboard';

// 强制动态渲染
export const dynamic = 'force-dynamic';

export default function MonitoringPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-8">
        <MonitoringDashboard />
      </div>
    </div>
  );
}

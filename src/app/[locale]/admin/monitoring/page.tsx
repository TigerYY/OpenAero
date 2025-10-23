import { MainLayout } from '@/components/layout/MainLayout';
import { MonitoringDashboard } from '@/components/admin/MonitoringDashboard';

export default function MonitoringPage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="container py-8">
          <MonitoringDashboard />
        </div>
      </div>
    </MainLayout>
  );
}

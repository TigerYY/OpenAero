import { MonitoringDashboard } from '@/components/admin/MonitoringDashboard';
import { AdminLayout } from '@/components/layout/AdminLayout';

interface MonitoringPageProps {
  params: {
    locale: string;
  };
}

export default function MonitoringPage({ params: { locale } }: MonitoringPageProps) {
  return (
    <AdminLayout>
      <div className="bg-gray-50">
        <div className="container py-8">
          <MonitoringDashboard />
        </div>
      </div>
    </AdminLayout>
  );
}

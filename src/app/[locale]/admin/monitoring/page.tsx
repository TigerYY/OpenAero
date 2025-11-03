import { MonitoringDashboard } from '@/components/admin/MonitoringDashboard';
import { MainLayout } from '@/components/layout/MainLayout';

interface MonitoringPageProps {
  params: {
    locale: string;
  };
}

export default function MonitoringPage({ params: { locale } }: MonitoringPageProps) {
  return (
    <MainLayout locale={locale}>
      <div className="min-h-screen bg-gray-50">
        <div className="container py-8">
          <MonitoringDashboard />
        </div>
      </div>
    </MainLayout>
  );
}

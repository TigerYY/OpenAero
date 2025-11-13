import { MonitoringDashboard } from '@/components/admin/MonitoringDashboard';
import { DefaultLayout } from '@/components/layout/DefaultLayout';

interface MonitoringPageProps {
  params: {
    locale: string;
  };
}

export default function MonitoringPage({ params: { locale } }: MonitoringPageProps) {
  return (
    <DefaultLayout>
      <div className="bg-gray-50">
        <div className="container py-8">
          <MonitoringDashboard />
        </div>
      </div>
    </DefaultLayout>
  );
}

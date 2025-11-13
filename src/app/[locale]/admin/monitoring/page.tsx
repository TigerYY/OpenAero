import { MonitoringDashboard } from '@/components/admin/MonitoringDashboard';

interface MonitoringPageProps {
  params: {
    locale: string;
  };
}

export default function MonitoringPage({ params: { locale } }: MonitoringPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-8">
        <MonitoringDashboard />
      </div>
    </div>
  );
}

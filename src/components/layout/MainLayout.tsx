import { Footer } from './Footer';
import { ServerHeader } from './ServerHeader';

interface MainLayoutProps {
  children: React.ReactNode;
  locale?: string;
}

export async function MainLayout({ children, locale = 'zh-CN' }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <ServerHeader locale={locale} />
      <main>{children}</main>
      <Footer />
    </div>
  );
}

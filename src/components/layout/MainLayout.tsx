'use client';

import { Footer } from './Footer';
import { Header } from './Header';

interface MainLayoutProps {
  children: React.ReactNode;
  locale?: string;
}

export function MainLayout({ children, locale = 'zh-CN' }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <Header locale={locale} />
      <main>{children}</main>
      <Footer />
    </div>
  );
}

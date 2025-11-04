'use client';

import { Footer } from './Footer';
import { Header } from './Header';

interface AuthLayoutProps {
  children: React.ReactNode;
  locale?: string;
}

export function AuthLayout({ children, locale = 'zh-CN' }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header locale={locale} />
      <main className="py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
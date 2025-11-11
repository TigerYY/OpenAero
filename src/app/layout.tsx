import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';
import { CartProvider } from '@/components/shop/CartProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OpenAero - 开放式无人机平台',
  description: '专业的无人机解决方案平台，提供硬件、软件和技术支持',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <CartProvider>
          <div className="min-h-screen bg-gray-50">
            <main>
              {children}
            </main>
          </div>
        </CartProvider>
      </body>
    </html>
  );
}

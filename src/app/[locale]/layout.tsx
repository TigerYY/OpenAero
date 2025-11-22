/**
 * 根布局组件
 * 添加页面过渡动画和移动端优化
 */

import { MobileOptimization } from '@/components/layout/MobileOptimization';
import { PageTransitionWrapper } from '@/components/layout/PageTransitionWrapper';
import { CartProvider } from '@/components/shop/CartProvider';
import { APP_CONFIG } from '@/config/app';
import { AuthProvider } from '@/contexts/AuthContext';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import { ReactNode } from 'react';

const inter = Inter({ subsets: ['latin'] });

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return {
    lang: locale,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // 验证语言参数
  if (!APP_CONFIG.supportedLocales.includes(locale as any)) {
    notFound();
  }

  // 加载消息 - 明确传递 locale 确保加载正确的翻译文件
  const messages = await getMessages({ locale });
  
  // 调试：确认加载的翻译文件
  if (process.env.NODE_ENV === 'development') {
    console.log(`[LocaleLayout] Loading locale: ${locale}`);
    console.log(`[LocaleLayout] Hero title (en):`, messages?.hero?.title);
  }

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <AuthProvider>
          <CartProvider>
            <NextIntlClientProvider locale={locale} messages={messages}>
              <MobileOptimization />
              <PageTransitionWrapper>
                {children}
              </PageTransitionWrapper>
            </NextIntlClientProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

/**
 * 根布局组件
 * 添加页面过渡动画和移动端优化
 */

import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { APP_CONFIG } from '@/config/app';
import { MobileOptimization } from '@/components/layout/MobileOptimization';
import { PageTransitionWrapper } from '@/components/layout/PageTransitionWrapper';

export const dynamic = 'force-dynamic';

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

  // 加载消息
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <MobileOptimization />
      <PageTransitionWrapper>
        {children}
      </PageTransitionWrapper>
    </NextIntlClientProvider>
  );
}

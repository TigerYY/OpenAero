import React from 'react';

import ContactPageClient from './ContactPageClient';
import { DefaultLayout } from '@/components/layout/DefaultLayout';

export const metadata = {
  title: '联系我们 - 开元空御',
  description: '联系开元空御团队，获取专业的无人机解决方案支持。我们提供24小时客服服务，为您解答任何问题。',
  keywords: '联系我们,客服支持,技术支持,开元空御,无人机',
  openGraph: {
    title: '联系我们 - 开元空御',
    description: '联系开元空御团队，获取专业的无人机解决方案支持。',
    type: 'website',
  },
};

export default function ContactPage() {
  return (
    <DefaultLayout>
      <ContactPageClient />
    </DefaultLayout>
  );
}
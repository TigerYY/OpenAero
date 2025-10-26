import { APP_CONFIG } from '@/config/app';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

// 强制动态渲染
export const dynamic = 'force-dynamic';

// 生成动态metadata
export async function generateMetadata({
  params
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale = params.locale;
  
  // 验证locale
  if (!APP_CONFIG.supportedLocales.includes(locale as any)) {
    notFound();
  }

  // 根据locale返回不同的metadata
  if (locale === 'en-US') {
    return {
      title: {
        default: 'OpenAero - Community-Driven Open Drone Solutions Platform',
        template: '%s | OpenAero',
      },
      description: 'OpenAero is a community-driven open drone solutions platform connecting global drone creators with professional clients. We are committed to professional verification, production and sales of excellent drone innovation designs.',
      keywords: [
        'drone',
        'core kit',
        'open source',
        'community driven',
        'creators',
        'solutions',
        'certification standards',
        'OpenAero',
      ],
      authors: [{ name: 'OpenAero Team' }],
      creator: 'OpenAero',
      publisher: 'OpenAero',
      formatDetection: {
        email: false,
        address: false,
        telephone: false,
      },
      metadataBase: new URL('https://openaero.cn'),
      alternates: {
        canonical: '/',
      },
      openGraph: {
        type: 'website',
        locale: 'en_US',
        url: 'https://openaero.cn',
        siteName: 'OpenAero',
        title: 'OpenAero - Community-Driven Open Drone Solutions Platform',
        description: 'Connecting global drone creators with professional clients',
        images: [
          {
            url: '/og-image.jpg',
            width: 1200,
            height: 630,
            alt: 'OpenAero - Community-Driven Open Drone Solutions Platform',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'OpenAero - Community-Driven Open Drone Solutions Platform',
        description: 'Connecting global drone creators with professional clients',
        images: ['/og-image.jpg'],
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
      verification: {
        google: 'your-google-verification-code',
        yandex: 'your-yandex-verification-code',
      },
    };
  }

  // 中文metadata (默认)
  return {
    title: {
      default: '开元空御 - 社区驱动的开放式无人机解决方案平台',
      template: '%s | 开元空御',
    },
    description: '开元空御是一个社区驱动的开放式无人机解决方案平台，连接全球无人机创作者与专业客户。我们致力于将优秀的无人机创新设计进行专业验证、生产和销售。',
    keywords: [
      '无人机',
      '核心套件',
      '开源',
      '社区驱动',
      '创作者',
      '解决方案',
      '认证标准',
      '开元空御',
    ],
    authors: [{ name: '开元空御团队' }],
    creator: '开元空御',
    publisher: '开元空御',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL('https://openaero.cn'),
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      locale: 'zh_CN',
      url: 'https://openaero.cn',
      siteName: '开元空御',
      title: '开元空御 - 社区驱动的开放式无人机解决方案平台',
      description: '连接全球无人机创作者与专业客户的开放式平台',
      images: [
        {
          url: '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: '开元空御 - 社区驱动的开放式无人机解决方案平台',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: '开元空御 - 社区驱动的开放式无人机解决方案平台',
      description: '连接全球无人机创作者与专业客户的开放式平台',
      images: ['/og-image.jpg'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: 'your-google-verification-code',
      yandex: 'your-yandex-verification-code',
    },
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale = params.locale;
  
  // 验证locale
  if (!APP_CONFIG.supportedLocales.includes(locale as any)) {
    notFound();
  }

  // 获取对应语言的messages
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}

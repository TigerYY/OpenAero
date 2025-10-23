import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html className="h-full">
      <body className={`${inter.className} h-full bg-white antialiased`}>
        <div id="root" className="h-full">
          {children}
        </div>
      </body>
    </html>
  );
}

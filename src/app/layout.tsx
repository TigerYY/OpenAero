import type { Metadata } from 'next';

import './globals.css';

// 强制动态，避免构建期静态化导致运行时缺失 preview/_error
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'OpenAero - 开放式无人机平台',
  description: '专业的无人机解决方案平台，提供硬件、软件和技术支持',
};

// 根布局在 next-intl 中应该只返回 children
// 实际的 <html> 和 <body> 标签由 [locale]/layout.tsx 提供
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}

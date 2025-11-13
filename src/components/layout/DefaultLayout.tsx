'use client';

import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface DefaultLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  className?: string;
}

/**
 * 默认布局组件
 * 
 * 包含 Header 和 Footer 的标准页面布局
 * 所有常规页面都应该使用这个布局
 * 
 * @param children - 页面内容
 * @param showHeader - 是否显示 Header (默认: true)
 * @param showFooter - 是否显示 Footer (默认: true)
 * @param className - 额外的 CSS 类名
 */
export function DefaultLayout({
  children,
  showHeader = true,
  showFooter = true,
  className = '',
}: DefaultLayoutProps) {
  return (
    <div className={`flex flex-col min-h-screen ${className}`}>
      {showHeader && <Header />}
      
      <main className="flex-1">
        {children}
      </main>
      
      {showFooter && <Footer />}
    </div>
  );
}

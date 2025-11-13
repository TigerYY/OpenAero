'use client';

import { ReactNode } from 'react';

interface EmptyLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * 空布局组件
 * 
 * 不包含 Header 和 Footer 的纯净布局
 * 用于特殊页面，如:
 * - 全屏展示页面
 * - 嵌入式页面
 * - 打印页面
 * - 错误页面
 * 
 * @param children - 页面内容
 * @param className - 额外的 CSS 类名
 */
export function EmptyLayout({
  children,
  className = '',
}: EmptyLayoutProps) {
  return (
    <div className={`min-h-screen ${className}`}>
      {children}
    </div>
  );
}

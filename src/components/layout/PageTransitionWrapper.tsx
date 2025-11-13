/**
 * 页面过渡动画包装器
 * 客户端组件，用于包装页面内容并添加过渡动画
 */

'use client';

import { ReactNode } from 'react';
import { PageTransition } from '@/lib/page-transitions';

export interface PageTransitionWrapperProps {
  children: ReactNode;
}

export function PageTransitionWrapper({ children }: PageTransitionWrapperProps) {
  return <PageTransition>{children}</PageTransition>;
}


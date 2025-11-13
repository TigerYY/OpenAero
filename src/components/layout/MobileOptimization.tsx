/**
 * 移动端优化组件
 * 应用移动端优化功能
 */

'use client';

import { usePreventDoubleTapZoom, useViewportHeight, useSmoothScroll } from '@/lib/mobile-optimization';

export function MobileOptimization() {
  usePreventDoubleTapZoom();
  useViewportHeight();
  useSmoothScroll();

  return null;
}


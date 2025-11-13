/**
 * 懒加载工具
 * 用于实现组件的动态导入和懒加载
 */

'use client';

import React, { lazy, Suspense, ComponentType } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

/**
 * 创建懒加载组件包装器
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc);

  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={fallback || <LoadingSpinner size="md" message="加载中..." />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

/**
 * 图片懒加载 Hook
 */
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = React.useState(placeholder || '');
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
    };
    img.onerror = () => {
      // 加载失败时保持占位符
      setIsLoaded(false);
    };
  }, [src, placeholder]);

  return { imageSrc, isLoaded };
}

/**
 * 滚动懒加载 Hook
 */
export function useIntersectionObserver(
  ref: React.RefObject<HTMLElement>,
  options?: IntersectionObserverInit
) {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        ...options,
      }
    );

    observer.observe(ref.current);

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [ref, options]);

  return isIntersecting;
}


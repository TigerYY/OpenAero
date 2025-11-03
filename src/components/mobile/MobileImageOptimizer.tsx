'use client';

import Image from 'next/image';
import React, { useState, useRef, useEffect, useCallback } from 'react';

// 图片优化配置
interface ImageOptimizationConfig {
  quality?: number;
  format?: 'webp' | 'avif' | 'auto';
  sizes?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

// 移动端图片组件属性
interface MobileOptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  optimization?: ImageOptimizationConfig;
  lazy?: boolean;
  progressive?: boolean;
  fallback?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  onClick?: () => void;
}

// 图片加载状态
type ImageLoadState = 'loading' | 'loaded' | 'error';

// 生成模糊占位符
const generateBlurDataURL = (width: number, height: number): string => {
  if (typeof window === 'undefined') {
    return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==';
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // 创建渐变背景
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f3f4f6');
    gradient.addColorStop(1, '#e5e7eb');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
  
  return canvas.toDataURL('image/jpeg', 0.1);
};

// 检测 WebP 支持
const checkWebPSupport = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const webP = document.createElement('img');
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
};

// 移动端优化图片组件
const MobileOptimizedImage: React.FC<MobileOptimizedImageProps> = ({
  src,
  alt,
  width = 400,
  height = 300,
  className = '',
  style = {},
  optimization = {},
  lazy = true,
  progressive = true,
  fallback,
  onLoad,
  onError,
  onClick
}) => {
  const [loadState, setLoadState] = useState<ImageLoadState>('loading');
  const [isInView, setIsInView] = useState(!lazy);
  const [webpSupported, setWebpSupported] = useState<boolean | null>(null);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const imgRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 检测 WebP 支持
  useEffect(() => {
    checkWebPSupport().then(setWebpSupported);
  }, []);

  // 懒加载观察器
  useEffect(() => {
    if (!lazy || isInView) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // 提前50px开始加载
        threshold: 0.1
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [lazy, isInView]);

  // 优化图片 URL
  const getOptimizedSrc = useCallback((originalSrc: string): string => {
    if (!originalSrc) return '';

    // 如果是外部 URL，直接返回
    if (originalSrc.startsWith('http')) {
      return originalSrc;
    }

    // 构建 Next.js 图片优化 URL
    const params = new URLSearchParams();
    
    if (optimization.quality) {
      params.set('q', optimization.quality.toString());
    } else {
      params.set('q', '75'); // 移动端默认质量
    }

    if (width) params.set('w', width.toString());
    
    // 格式优化
    if (webpSupported && optimization.format !== 'auto') {
      if (optimization.format === 'webp' || optimization.format === 'avif') {
        params.set('f', optimization.format);
      }
    }

    return `/_next/image?url=${encodeURIComponent(originalSrc)}&${params.toString()}`;
  }, [optimization, width, webpSupported]);

  // 渐进式加载
  useEffect(() => {
    if (!isInView || !progressive) {
      setCurrentSrc(getOptimizedSrc(src));
      return;
    }

    // 先加载低质量版本
    const lowQualitySrc = getOptimizedSrc(src).replace(/q=\d+/, 'q=20');
    setCurrentSrc(lowQualitySrc);

    // 然后加载高质量版本
    const highQualityImg = document.createElement('img');
    highQualityImg.onload = () => {
      setCurrentSrc(getOptimizedSrc(src));
    };
    highQualityImg.src = getOptimizedSrc(src);
  }, [isInView, src, getOptimizedSrc, progressive]);

  // 处理图片加载
  const handleLoad = useCallback(() => {
    setLoadState('loaded');
    onLoad?.();
  }, [onLoad]);

  // 处理图片错误
  const handleError = useCallback(() => {
    setLoadState('error');
    if (fallback) {
      setCurrentSrc(fallback);
    }
    onError?.(new Error('Image failed to load'));
  }, [fallback, onError]);

  // 生成占位符
  const blurDataURL = optimization.blurDataURL || 
    (typeof window !== 'undefined' ? generateBlurDataURL(width, height) : '');

  // 响应式尺寸
  const sizes = optimization.sizes || 
    '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height, ...style }}
      onClick={onClick}
    >
      {/* 加载状态 */}
      {loadState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      )}

      {/* 错误状态 */}
      {loadState === 'error' && !fallback && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-500">
          <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm">图片加载失败</span>
        </div>
      )}

      {/* 实际图片 */}
      {isInView && currentSrc && (
        <Image
          src={currentSrc}
          alt={alt}
          width={width}
          height={height}
          className={`transition-opacity duration-300 ${
            loadState === 'loaded' ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ objectFit: 'cover' }}
          sizes={sizes}
          priority={optimization.priority}
          placeholder={optimization.placeholder || 'blur'}
          blurDataURL={blurDataURL}
          onLoad={handleLoad}
          onError={handleError}
          quality={optimization.quality || 75}
        />
      )}
    </div>
  );
};

// 图片画廊组件（支持虚拟滚动）
interface ImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    width?: number;
    height?: number;
  }>;
  columns?: number;
  gap?: number;
  className?: string;
  onImageClick?: (index: number) => void;
}

const MobileImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  columns = 2,
  gap = 8,
  className = '',
  onImageClick
}) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
  const containerRef = useRef<HTMLDivElement>(null);

  // 虚拟滚动
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const itemHeight = 200; // 估算的图片高度
      const rowsPerScreen = Math.ceil(containerHeight / itemHeight);
      const totalRows = Math.ceil(images.length / columns);
      
      const startRow = Math.floor(scrollTop / itemHeight);
      const endRow = Math.min(startRow + rowsPerScreen + 2, totalRows);
      
      setVisibleRange({
        start: startRow * columns,
        end: endRow * columns
      });
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll(); // 初始计算

    return () => container.removeEventListener('scroll', handleScroll);
  }, [images.length, columns]);

  const visibleImages = images.slice(visibleRange.start, visibleRange.end);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: '100%' }}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: `${gap}px`,
          paddingTop: `${Math.floor(visibleRange.start / columns) * 200}px`,
          paddingBottom: `${Math.max(0, Math.ceil((images.length - visibleRange.end) / columns)) * 200}px`
        }}
      >
        {visibleImages.map((image, index) => {
          const actualIndex = visibleRange.start + index;
          return (
            <MobileOptimizedImage
              key={actualIndex}
              src={image.src}
              alt={image.alt}
              width={image.width || 200}
              height={image.height || 200}
              className="rounded-lg cursor-pointer hover:scale-105 transition-transform"
              onClick={() => onImageClick?.(actualIndex)}
              optimization={{
                quality: 60,
                format: 'webp'
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export { MobileOptimizedImage, MobileImageGallery };
export default MobileOptimizedImage;
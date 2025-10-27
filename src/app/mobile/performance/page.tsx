'use client';

import React, { useState, useEffect } from 'react';
import { MobileLazyLoader } from '@/components/mobile/LazyComponentLoader';
import MobileOptimizedImage, { MobileImageGallery } from '@/components/mobile/MobileImageOptimizer';
import MobileBundleAnalyzer from '@/components/mobile/MobileBundleAnalyzer';

// 懒加载的示例组件
const LazyHeavyComponent = MobileLazyLoader.create(
  () => import('@/components/forms/ContactForm'),
  {
    mobileOptimized: true,
    loading: (
      <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">正在加载联系表单...</p>
        </div>
      </div>
    )
  }
);

const LazyCreatorForm = MobileLazyLoader.create(
  () => import('@/components/forms/CreatorApplicationForm'),
  {
    mobileOptimized: true,
    preload: true // 预加载关键组件
  }
);

export default function MobilePerformancePage() {
  const [activeDemo, setActiveDemo] = useState<'lazy' | 'images' | 'bundle'>('lazy');
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [showLazyComponent, setShowLazyComponent] = useState(false);

  // 示例图片数据
  const sampleImages = [
    { src: '/images/drone-1.jpg', alt: '无人机产品 1', width: 300, height: 200 },
    { src: '/images/drone-2.jpg', alt: '无人机产品 2', width: 300, height: 200 },
    { src: '/images/factory-1.jpg', alt: '工厂场景 1', width: 300, height: 200 },
    { src: '/images/factory-2.jpg', alt: '工厂场景 2', width: 300, height: 200 },
    { src: '/images/tech-1.jpg', alt: '技术展示 1', width: 300, height: 200 },
    { src: '/images/tech-2.jpg', alt: '技术展示 2', width: 300, height: 200 },
    { src: '/images/solution-1.jpg', alt: '解决方案 1', width: 300, height: 200 },
    { src: '/images/solution-2.jpg', alt: '解决方案 2', width: 300, height: 200 }
  ];

  // 收集性能指标
  useEffect(() => {
    const collectMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const memory = (performance as any).memory;
      
      setPerformanceMetrics({
        loadTime: navigation ? Math.round(navigation.loadEventEnd - navigation.fetchStart) : 0,
        domContentLoaded: navigation ? Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart) : 0,
        memoryUsed: memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : 0,
        memoryLimit: memory ? Math.round(memory.jsHeapSizeLimit / 1024 / 1024) : 0
      });
    };

    // 页面加载完成后收集指标
    if (document.readyState === 'complete') {
      collectMetrics();
    } else {
      window.addEventListener('load', collectMetrics);
      return () => window.removeEventListener('load', collectMetrics);
    }
  }, []);

  // 预加载关键组件
  useEffect(() => {
    // 预加载其他可能需要的组件
    MobileLazyLoader.preloadBatch([
      () => import('@/components/forms/ContactForm'),
      () => import('@/components/forms/CreatorApplicationForm')
    ]);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">移动端性能优化</h1>
          <p className="text-sm text-gray-600 mt-1">
            展示懒加载、图片优化和包分析等性能优化技术
          </p>
        </div>
      </header>

      {/* 性能指标卡片 */}
      {performanceMetrics && (
        <div className="p-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">当前页面性能</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">页面加载时间:</span>
                <span className="ml-2 font-semibold text-blue-600">
                  {performanceMetrics.loadTime}ms
                </span>
              </div>
              <div>
                <span className="text-gray-600">DOM 就绪时间:</span>
                <span className="ml-2 font-semibold text-green-600">
                  {performanceMetrics.domContentLoaded}ms
                </span>
              </div>
              <div>
                <span className="text-gray-600">内存使用:</span>
                <span className="ml-2 font-semibold text-purple-600">
                  {performanceMetrics.memoryUsed}MB
                </span>
              </div>
              <div>
                <span className="text-gray-600">内存限制:</span>
                <span className="ml-2 font-semibold text-gray-600">
                  {performanceMetrics.memoryLimit}MB
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 标签页导航 */}
      <div className="px-4">
        <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 p-1 mb-4">
          {[
            { key: 'lazy', label: '懒加载', icon: '⚡' },
            { key: 'images', label: '图片优化', icon: '🖼️' },
            { key: 'bundle', label: '包分析', icon: '📊' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveDemo(tab.key as any)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-colors ${
                activeDemo === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="px-4 pb-8">
        {activeDemo === 'lazy' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">组件懒加载演示</h2>
              
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2">懒加载优势</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• 减少初始包大小，提升首屏加载速度</li>
                    <li>• 按需加载组件，降低内存使用</li>
                    <li>• 支持预加载关键组件</li>
                    <li>• 提供加载状态和错误处理</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setShowLazyComponent(!showLazyComponent)}
                    className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {showLazyComponent ? '隐藏' : '加载'} 联系表单组件
                  </button>

                  {showLazyComponent && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <LazyHeavyComponent />
                    </div>
                  )}
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-900 mb-2">预加载组件示例</h3>
                  <p className="text-sm text-green-800 mb-3">
                    创作者申请表单已在后台预加载，点击下方按钮可立即显示：
                  </p>
                  <LazyCreatorForm />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeDemo === 'images' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">图片优化演示</h2>
              
              <div className="space-y-6">
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h3 className="font-semibold text-purple-900 mb-2">优化特性</h3>
                  <ul className="text-sm text-purple-800 space-y-1">
                    <li>• 自动 WebP/AVIF 格式检测和转换</li>
                    <li>• 懒加载和渐进式加载</li>
                    <li>• 响应式图片尺寸</li>
                    <li>• 模糊占位符和加载状态</li>
                    <li>• 虚拟滚动支持（画廊组件）</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">单张图片优化</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">标准加载</h4>
                      <MobileOptimizedImage
                        src="/images/drone-sample.jpg"
                        alt="无人机产品展示"
                        width={200}
                        height={150}
                        className="rounded-lg"
                        lazy={false}
                        optimization={{ quality: 90 }}
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">渐进式加载</h4>
                      <MobileOptimizedImage
                        src="/images/factory-sample.jpg"
                        alt="工厂场景"
                        width={200}
                        height={150}
                        className="rounded-lg"
                        progressive={true}
                        optimization={{ quality: 75, format: 'webp' }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">图片画廊（虚拟滚动）</h3>
                  <div className="h-96 border border-gray-200 rounded-lg overflow-hidden">
                    <MobileImageGallery
                      images={sampleImages}
                      columns={2}
                      gap={8}
                      onImageClick={(index) => {
                        alert(`点击了第 ${index + 1} 张图片`);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeDemo === 'bundle' && (
          <div className="space-y-6">
            <MobileBundleAnalyzer />
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">优化建议</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">代码分割</h4>
                  <p className="text-sm text-gray-700">
                    使用动态导入和懒加载将大型组件分割成更小的块，按需加载。
                  </p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Tree Shaking</h4>
                  <p className="text-sm text-gray-700">
                    确保只导入实际使用的代码，移除未使用的导出和依赖。
                  </p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">压缩优化</h4>
                  <p className="text-sm text-gray-700">
                    启用 Gzip/Brotli 压缩，使用现代化的构建工具进行代码压缩。
                  </p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">缓存策略</h4>
                  <p className="text-sm text-gray-700">
                    合理设置缓存头，使用 Service Worker 进行离线缓存。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
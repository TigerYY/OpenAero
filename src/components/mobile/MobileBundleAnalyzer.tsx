'use client';

import React, { useState, useEffect, useCallback } from 'react';

// 性能指标接口
interface PerformanceMetrics {
  bundleSize: number;
  loadTime: number;
  memoryUsage: number;
  renderTime: number;
  interactionTime: number;
}

// 组件大小信息
interface ComponentSize {
  name: string;
  size: number;
  gzipSize: number;
  percentage: number;
}

// 性能建议
interface PerformanceSuggestion {
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  solution: string;
}

// 移动端包分析器组件
const MobileBundleAnalyzer: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [components, setComponents] = useState<ComponentSize[]>([]);
  const [suggestions, setSuggestions] = useState<PerformanceSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'components' | 'suggestions'>('overview');

  // 模拟获取性能指标
  const getPerformanceMetrics = useCallback((): PerformanceMetrics => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const memory = (performance as any).memory;
    
    return {
      bundleSize: Math.round(Math.random() * 500 + 200), // KB
      loadTime: navigation ? Math.round(navigation.loadEventEnd - navigation.fetchStart) : 0,
      memoryUsage: memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : 0, // MB
      renderTime: navigation ? Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart) : 0,
      interactionTime: Math.round(Math.random() * 100 + 50)
    };
  }, []);

  // 模拟组件大小分析
  const analyzeComponents = useCallback((): ComponentSize[] => {
    const mockComponents = [
      { name: 'React', size: 45.2, gzipSize: 15.3 },
      { name: 'Next.js Runtime', size: 38.7, gzipSize: 12.8 },
      { name: 'Tailwind CSS', size: 28.4, gzipSize: 8.2 },
      { name: 'Form Components', size: 22.1, gzipSize: 7.1 },
      { name: 'Navigation', size: 18.9, gzipSize: 6.2 },
      { name: 'UI Components', size: 15.6, gzipSize: 5.1 },
      { name: 'Utilities', size: 12.3, gzipSize: 4.2 },
      { name: 'Icons', size: 9.8, gzipSize: 3.1 },
      { name: 'Animations', size: 7.4, gzipSize: 2.8 },
      { name: 'Other', size: 5.2, gzipSize: 1.9 }
    ];

    const totalSize = mockComponents.reduce((sum, comp) => sum + comp.size, 0);
    
    return mockComponents.map(comp => ({
      ...comp,
      percentage: Math.round((comp.size / totalSize) * 100)
    }));
  }, []);

  // 生成性能建议
  const generateSuggestions = useCallback((metrics: PerformanceMetrics, components: ComponentSize[]): PerformanceSuggestion[] => {
    const suggestions: PerformanceSuggestion[] = [];

    // 包大小建议
    if (metrics.bundleSize > 300) {
      suggestions.push({
        type: 'warning',
        title: 'JavaScript 包过大',
        description: `当前包大小为 ${metrics.bundleSize}KB，建议控制在 250KB 以内`,
        impact: 'high',
        solution: '使用代码分割、懒加载和 Tree Shaking 优化'
      });
    }

    // 加载时间建议
    if (metrics.loadTime > 3000) {
      suggestions.push({
        type: 'error',
        title: '页面加载时间过长',
        description: `当前加载时间为 ${metrics.loadTime}ms，严重影响用户体验`,
        impact: 'high',
        solution: '优化关键资源加载顺序，使用 CDN 和缓存策略'
      });
    }

    // 内存使用建议
    if (metrics.memoryUsage > 50) {
      suggestions.push({
        type: 'warning',
        title: '内存使用过高',
        description: `当前内存使用 ${metrics.memoryUsage}MB，可能导致移动设备卡顿`,
        impact: 'medium',
        solution: '检查内存泄漏，优化大型组件和数据结构'
      });
    }

    // 组件优化建议
    const largeComponents = components.filter(comp => comp.size > 20);
    if (largeComponents.length > 0) {
      suggestions.push({
        type: 'info',
        title: '大型组件优化',
        description: `发现 ${largeComponents.length} 个大型组件，可以进一步优化`,
        impact: 'medium',
        solution: '考虑组件拆分、懒加载或使用更轻量的替代方案'
      });
    }

    return suggestions;
  }, []);

  // 执行分析
  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    
    // 模拟分析过程
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const performanceMetrics = getPerformanceMetrics();
    const componentSizes = analyzeComponents();
    const performanceSuggestions = generateSuggestions(performanceMetrics, componentSizes);
    
    setMetrics(performanceMetrics);
    setComponents(componentSizes);
    setSuggestions(performanceSuggestions);
    setIsAnalyzing(false);
  }, [getPerformanceMetrics, analyzeComponents, generateSuggestions]);

  // 初始化分析
  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  // 格式化文件大小
  const formatSize = (sizeKB: number): string => {
    if (sizeKB < 1024) {
      return `${sizeKB.toFixed(1)} KB`;
    }
    return `${(sizeKB / 1024).toFixed(1)} MB`;
  };

  // 获取性能评分颜色
  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  // 计算性能评分
  const calculateScore = (metrics: PerformanceMetrics): number => {
    let score = 100;
    
    // 包大小评分 (40%)
    if (metrics.bundleSize > 300) score -= 20;
    else if (metrics.bundleSize > 200) score -= 10;
    
    // 加载时间评分 (30%)
    if (metrics.loadTime > 3000) score -= 15;
    else if (metrics.loadTime > 2000) score -= 8;
    
    // 内存使用评分 (20%)
    if (metrics.memoryUsage > 50) score -= 10;
    else if (metrics.memoryUsage > 30) score -= 5;
    
    // 交互时间评分 (10%)
    if (metrics.interactionTime > 100) score -= 5;
    
    return Math.max(0, score);
  };

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-sm">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">正在分析性能...</h3>
        <p className="text-sm text-gray-600 text-center">
          正在检测包大小、加载时间和内存使用情况
        </p>
      </div>
    );
  }

  if (!metrics) return null;

  const performanceScore = calculateScore(metrics);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 标题栏 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">移动端性能分析</h2>
          <button
            onClick={runAnalysis}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            重新分析
          </button>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'overview', label: '概览' },
          { key: 'components', label: '组件分析' },
          { key: 'suggestions', label: '优化建议' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 性能评分 */}
            <div className="text-center">
              <div className={`text-4xl font-bold mb-2 ${getScoreColor(performanceScore)}`}>
                {performanceScore}
              </div>
              <p className="text-gray-600">性能评分</p>
            </div>

            {/* 关键指标 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{formatSize(metrics.bundleSize)}</div>
                <div className="text-sm text-gray-600">包大小</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{metrics.loadTime}ms</div>
                <div className="text-sm text-gray-600">加载时间</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{metrics.memoryUsage}MB</div>
                <div className="text-sm text-gray-600">内存使用</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{metrics.interactionTime}ms</div>
                <div className="text-sm text-gray-600">交互时间</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'components' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">组件大小分析</h3>
            {components.map((component, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{component.name}</div>
                  <div className="text-sm text-gray-600">
                    原始: {formatSize(component.size)} | Gzip: {formatSize(component.gzipSize)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">{component.percentage}%</div>
                  <div className="w-16 h-2 bg-gray-200 rounded-full mt-1">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${component.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">优化建议</h3>
            {suggestions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="w-16 h-16 mx-auto mb-4 text-green-500">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p>太棒了！没有发现需要优化的问题。</p>
              </div>
            ) : (
              suggestions.map((suggestion, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${
                  suggestion.type === 'error' ? 'bg-red-50 border-red-500' :
                  suggestion.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                  'bg-blue-50 border-blue-500'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{suggestion.title}</h4>
                      <p className="text-sm text-gray-700 mb-2">{suggestion.description}</p>
                      <p className="text-sm text-gray-600">{suggestion.solution}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      suggestion.impact === 'high' ? 'bg-red-100 text-red-800' :
                      suggestion.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {suggestion.impact === 'high' ? '高' : suggestion.impact === 'medium' ? '中' : '低'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileBundleAnalyzer;
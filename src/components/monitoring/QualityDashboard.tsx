'use client';

import React, { useState, useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface QualityMetric {
  type: 'coverage' | 'performance' | 'security' | 'accessibility' | 'bundle-size';
  score: number;
  threshold: number;
  passed: boolean;
  timestamp: number;
  details?: Record<string, any>;
}

interface QualityStats {
  overall: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  };
  byType: Record<string, {
    count: number;
    passed: number;
    failed: number;
    passRate: number;
    avgScore: number;
    minScore: number;
    maxScore: number;
    latestScore: number;
    trend: 'improving' | 'declining' | 'stable';
  }>;
}

const typeLabels = {
  coverage: '测试覆盖率',
  performance: '性能指标',
  security: '安全审计',
  accessibility: '可访问性',
  'bundle-size': '包大小'
};

const typeColors = {
  coverage: 'bg-blue-500',
  performance: 'bg-green-500',
  security: 'bg-red-500',
  accessibility: 'bg-purple-500',
  'bundle-size': 'bg-orange-500'
};

export default function QualityDashboard() {
  const [stats, setStats] = useState<QualityStats | null>(null);
  const [metrics, setMetrics] = useState<QualityMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24');

  const fetchQualityData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/monitoring/quality?hours=${selectedTimeRange}`);
      const data = await response.json();
      setStats(data.stats);
      setMetrics(data.metrics);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch quality data:', error);}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQualityData();
    
    // 定期刷新数据
    const interval = setInterval(fetchQualityData, 60000); // 每分钟刷新
    return () => clearInterval(interval);
  }, [selectedTimeRange]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <span className="text-green-500">↗</span>;
      case 'declining':
        return <span className="text-red-500">↘</span>;
      default:
        return <span className="text-gray-500">→</span>;
    }
  };

  const getScoreColor = (score: number, threshold: number) => {
    if (score >= threshold) return 'text-green-600';
    if (score >= threshold * 0.8) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">加载质量数据...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <div className="text-yellow-500 text-4xl mb-4">⚠️</div>
        <p className="text-gray-600">暂无质量数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部控制 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">质量监控仪表板</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="1">最近1小时</option>
            <option value="24">最近24小时</option>
            <option value="168">最近7天</option>
            <option value="720">最近30天</option>
          </select>
          <Button onClick={fetchQualityData} variant="outline" size="sm">
            🔄 刷新
          </Button>
        </div>
      </div>

      {/* 总体概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总检查数</p>
                <p className="text-2xl font-bold">{stats.overall.total}</p>
              </div>
              <div className="text-2xl">📊</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">通过数</p>
                <p className="text-2xl font-bold text-green-600">{stats.overall.passed}</p>
              </div>
              <div className="text-2xl">✅</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">失败数</p>
                <p className="text-2xl font-bold text-red-600">{stats.overall.failed}</p>
              </div>
              <div className="text-2xl">❌</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">通过率</p>
                <p className="text-2xl font-bold">{stats.overall.passRate.toFixed(1)}%</p>
              </div>
              <div className="text-2xl">
                {stats.overall.passRate >= 90 ? '🎯' : stats.overall.passRate >= 70 ? '⚡' : '🚨'}
              </div>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${stats.overall.passRate}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 分类详情 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">分类详情</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(stats.byType).map(([type, data]) => {
            const colorClass = typeColors[type as keyof typeof typeColors];
            
            return (
              <Card key={type}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <div className={`p-2 rounded-md ${colorClass}`}>
                        <span className="text-white text-sm">
                          {type === 'coverage' ? '🧪' : 
                           type === 'performance' ? '⚡' :
                           type === 'security' ? '🛡️' :
                           type === 'accessibility' ? '👁️' : '📦'}
                        </span>
                      </div>
                      <span>{typeLabels[type as keyof typeof typeLabels]}</span>
                    </div>
                    {getTrendIcon(data.trend)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">最新分数</span>
                      <span className={`font-bold ${getScoreColor(data.latestScore, 85)}`}>
                        {data.latestScore.toFixed(1)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">平均分数</span>
                      <span className="font-medium">{data.avgScore.toFixed(1)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">通过率</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        data.passRate >= 90 ? 'bg-green-100 text-green-800' :
                        data.passRate >= 70 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {data.passRate.toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${data.passRate}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>通过: {data.passed}</span>
                      <span>失败: {data.failed}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 最近检查记录 */}
      <Card>
        <CardHeader>
          <CardTitle>最近检查记录</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {metrics.slice(0, 10).map((metric, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-md ${typeColors[metric.type]}`}>
                    <span className="text-white text-sm">
                      {metric.type === 'coverage' ? '🧪' : 
                       metric.type === 'performance' ? '⚡' :
                       metric.type === 'security' ? '🛡️' :
                       metric.type === 'accessibility' ? '👁️' : '📦'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{typeLabels[metric.type]}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(metric.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`font-bold ${getScoreColor(metric.score, metric.threshold)}`}>
                    {metric.score.toFixed(1)}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    metric.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {metric.passed ? '通过' : '失败'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
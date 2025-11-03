'use client';

import React, { useState, useEffect } from 'react';

import AnalyticsChart from '@/components/business/AnalyticsChart';
import { Button } from '@/components/ui/Button';

interface AnalyticsData {
  overview: {
    totalRevenue: number;
    totalSales: number;
    totalUsers: number;
    conversionRate: number;
    revenueGrowth: number;
    salesGrowth: number;
    userGrowth: number;
    conversionGrowth: number;
  };
  revenueChart: {
    label: string;
    value: number;
  }[];
  salesChart: {
    label: string;
    value: number;
  }[];
  categoryChart: {
    label: string;
    value: number;
    color?: string;
  }[];
  userChart: {
    label: string;
    value: number;
  }[];
  topSolutions: {
    id: string;
    title: string;
    sales: number;
    revenue: number;
    rating: number;
  }[];
  topCreators: {
    id: string;
    name: string;
    solutions: number;
    revenue: number;
    rating: number;
  }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'users' | 'products'>('overview');

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setData({
        overview: {
          totalRevenue: 234567.89,
          totalSales: 1234,
          totalUsers: 12543,
          conversionRate: 3.45,
          revenueGrowth: 12.5,
          salesGrowth: 8.3,
          userGrowth: 15.2,
          conversionGrowth: -2.1
        },
        revenueChart: [
          { label: '1月', value: 15000 },
          { label: '2月', value: 18500 },
          { label: '3月', value: 22000 },
          { label: '4月', value: 25500 },
          { label: '5月', value: 28000 },
          { label: '6月', value: 32000 }
        ],
        salesChart: [
          { label: '1月', value: 120 },
          { label: '2月', value: 145 },
          { label: '3月', value: 180 },
          { label: '4月', value: 210 },
          { label: '5月', value: 240 },
          { label: '6月', value: 280 }
        ],
        categoryChart: [
          { label: 'React组件', value: 450, color: '#3B82F6' },
          { label: 'Vue.js工具', value: 320, color: '#10B981' },
          { label: 'Node.js后端', value: 280, color: '#F59E0B' },
          { label: 'Python脚本', value: 250, color: '#EF4444' },
          { label: 'UI设计', value: 200, color: '#8B5CF6' }
        ],
        userChart: [
          { label: '1月', value: 1200 },
          { label: '2月', value: 1350 },
          { label: '3月', value: 1500 },
          { label: '4月', value: 1680 },
          { label: '5月', value: 1850 },
          { label: '6月', value: 2000 }
        ],
        topSolutions: [
          { id: '1', title: 'React 高级组件库', sales: 156, revenue: 46680, rating: 4.8 },
          { id: '2', title: 'Vue3 状态管理工具', sales: 134, revenue: 26800, rating: 4.7 },
          { id: '3', title: 'Node.js API框架', sales: 98, revenue: 29400, rating: 4.6 },
          { id: '4', title: 'Python数据分析包', sales: 87, revenue: 17400, rating: 4.5 },
          { id: '5', title: 'UI设计系统', sales: 76, revenue: 22800, rating: 4.4 }
        ],
        topCreators: [
          { id: '1', name: '张开发', solutions: 12, revenue: 89600, rating: 4.9 },
          { id: '2', name: '李设计', solutions: 8, revenue: 67200, rating: 4.8 },
          { id: '3', name: '王全栈', solutions: 15, revenue: 54300, rating: 4.7 },
          { id: '4', name: '陈前端', solutions: 6, revenue: 43200, rating: 4.6 },
          { id: '5', name: '刘后端', solutions: 9, revenue: 38700, rating: 4.5 }
        ]
      });
    } catch (error) {
      console.error('加载分析数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getGrowthColor = (value: number) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">加载数据失败</p>
          <Button onClick={loadAnalyticsData} className="mt-4">
            重试
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">数据分析</h1>
              <p className="text-gray-600">平台运营数据统计与分析</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="7d">最近7天</option>
                <option value="30d">最近30天</option>
                <option value="90d">最近90天</option>
                <option value="1y">最近1年</option>
              </select>
              <Button onClick={loadAnalyticsData} variant="outline" size="sm">
                刷新数据
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 导航标签 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'overview', label: '概览' },
              { key: 'revenue', label: '收入分析' },
              { key: 'users', label: '用户分析' },
              { key: 'products', label: '产品分析' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 概览标签页 */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 关键指标 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">总收入</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(data.overview.totalRevenue)}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <span className={`text-sm ${getGrowthColor(data.overview.revenueGrowth)}`}>
                    {formatPercentage(data.overview.revenueGrowth)} 较上期
                  </span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">总销量</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {data.overview.totalSales.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <span className={`text-sm ${getGrowthColor(data.overview.salesGrowth)}`}>
                    {formatPercentage(data.overview.salesGrowth)} 较上期
                  </span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">总用户数</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {data.overview.totalUsers.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <span className={`text-sm ${getGrowthColor(data.overview.userGrowth)}`}>
                    {formatPercentage(data.overview.userGrowth)} 较上期
                  </span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">转化率</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {data.overview.conversionRate.toFixed(2)}%
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <span className={`text-sm ${getGrowthColor(data.overview.conversionGrowth)}`}>
                    {formatPercentage(data.overview.conversionGrowth)} 较上期
                  </span>
                </div>
              </div>
            </div>

            {/* 图表 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalyticsChart
                title="收入趋势"
                data={data.revenueChart}
                type="area"
                height={300}
                showGrid={true}
              />
              <AnalyticsChart
                title="销量趋势"
                data={data.salesChart}
                type="line"
                height={300}
                showGrid={true}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalyticsChart
                title="分类分布"
                data={data.categoryChart}
                type="pie"
                height={300}
                showLegend={true}
              />
              <AnalyticsChart
                title="用户增长"
                data={data.userChart}
                type="bar"
                height={300}
                showGrid={true}
              />
            </div>
          </div>
        )}

        {/* 收入分析标签页 */}
        {activeTab === 'revenue' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalyticsChart
                title="月度收入趋势"
                data={data.revenueChart}
                type="area"
                height={400}
                showGrid={true}
              />
              <AnalyticsChart
                title="分类收入分布"
                data={data.categoryChart}
                type="pie"
                height={400}
                showLegend={true}
              />
            </div>

            {/* 热销产品 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">热销产品</h3>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          产品名称
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          销量
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          收入
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          评分
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.topSolutions.map((solution) => (
                        <tr key={solution.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {solution.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {solution.sales}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(solution.revenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              <span className="mr-1">{solution.rating}</span>
                              <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 用户分析标签页 */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <AnalyticsChart
              title="用户增长趋势"
              data={data.userChart}
              type="area"
              height={400}
              showGrid={true}
            />
          </div>
        )}

        {/* 产品分析标签页 */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalyticsChart
                title="产品分类分布"
                data={data.categoryChart}
                type="bar"
                height={400}
                showGrid={true}
              />
              <AnalyticsChart
                title="销量分布"
                data={data.salesChart}
                type="line"
                height={400}
                showGrid={true}
              />
            </div>

            {/* 顶级创作者 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">顶级创作者</h3>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          创作者
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          作品数量
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          总收入
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          评分
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.topCreators.map((creator) => (
                        <tr key={creator.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {creator.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {creator.solutions}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(creator.revenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              <span className="mr-1">{creator.rating}</span>
                              <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
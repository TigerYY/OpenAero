'use client';

import React, { useEffect, useState, Suspense, lazy } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loader2 } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// 图表数据接口
interface ChartData {
  trends: Array<{
    date: string;
    solutions: number;
    users: number;
  }>;
  categoryDistribution: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
  statusDistribution: Array<{
    status: string;
    name: string;
    count: number;
  }>;
  revenueTrend: Array<{
    date: string;
    revenue: number;
  }>;
}

interface DashboardChartsProps {
  timeRange?: number; // 天数，默认30天
  className?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function DashboardCharts({ timeRange = 30, className = '' }: DashboardChartsProps) {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChartData();
  }, [timeRange]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/dashboard/charts?days=${timeRange}`);
      const result = await response.json();

      if (result.success && result.data) {
        setChartData(result.data);
      } else {
        setError(result.error || '获取图表数据失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取图表数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 text-center text-red-600 ${className}`}>
        <p>加载图表数据失败: {error}</p>
      </div>
    );
  }

  if (!chartData) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 趋势折线图 */}
      <Card>
        <CardHeader>
          <CardTitle>平台趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('zh-CN');
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="solutions" 
                stroke="#0088FE" 
                name="方案数"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="users" 
                stroke="#00C49F" 
                name="用户数"
                strokeWidth={2}
              />
              </LineChart>
            </ResponsiveContainer>
          </Suspense>
        </CardContent>
      </Card>

      {/* 分类分布饼图 */}
      <Card>
        <CardHeader>
          <CardTitle>分类分布</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
              <Pie
                data={chartData.categoryDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.name}: ${entry.percentage.toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.categoryDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Suspense>
        </CardContent>
      </Card>

      {/* 状态分布柱状图 */}
      <Card>
        <CardHeader>
          <CardTitle>状态分布</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.statusDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" name="数量" />
              </BarChart>
            </ResponsiveContainer>
          </Suspense>
        </CardContent>
      </Card>

      {/* 收入趋势图 */}
      <Card>
        <CardHeader>
          <CardTitle>收入趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('zh-CN');
                }}
                formatter={(value: number) => [`¥${value.toFixed(2)}`, '收入']}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#00C49F" 
                name="收入"
                strokeWidth={2}
              />
              </LineChart>
            </ResponsiveContainer>
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}


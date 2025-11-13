/**
 * 收益图表组件
 */

'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { formatCurrency } from '@/lib/utils';

interface RevenueData {
  period: string;
  totalRevenue: number;
  platformFee: number;
  transactionCount: number;
  monthlyStats: Array<{
    month: string;
    revenue: number;
    count: number;
  }>;
  solutionStats: Array<{
    solutionId: string;
    title: string;
    revenue: number;
    count: number;
  }>;
  recentTransactions: Array<{
    id: string;
    orderNumber: string | null;
    solutionTitle: string;
    revenue: number;
    platformFee: number;
    createdAt: string;
  }>;
}

interface RevenueChartProps {
  creatorId: string;
}

export default function RevenueChart({ creatorId }: RevenueChartProps) {
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'month' | 'year' | 'all'>('month');

  useEffect(() => {
    fetchRevenueData();
  }, [period]);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/creators/dashboard/revenue?period=${period}`);
      const data = await response.json();

      if (data.success) {
        setRevenueData(data.data);
      } else {
        setError(data.message || '获取收益数据失败');
      }
    } catch (err) {
      console.error('获取收益数据失败:', err);
      setError('网络错误，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            收益统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSpinner size="sm" message="加载收益数据..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            收益统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorMessage error={error} />
        </CardContent>
      </Card>
    );
  }

  if (!revenueData) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            收益统计
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={period === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('month')}
            >
              本月
            </Button>
            <Button
              variant={period === 'year' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('year')}
            >
              本年
            </Button>
            <Button
              variant={period === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('all')}
            >
              全部
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* 总览统计 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">总收益</div>
              <div className="text-2xl font-bold text-blue-900">
                {formatCurrency(revenueData.totalRevenue)}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">平台费用</div>
              <div className="text-2xl font-bold text-green-900">
                {formatCurrency(revenueData.platformFee)}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">交易次数</div>
              <div className="text-2xl font-bold text-purple-900">
                {revenueData.transactionCount}
              </div>
            </div>
          </div>

          {/* 月度趋势（简单柱状图） */}
          {revenueData.monthlyStats.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-4">月度收益趋势</h4>
              <div className="space-y-2">
                {revenueData.monthlyStats.map((stat) => {
                  const maxRevenue = Math.max(...revenueData.monthlyStats.map((s) => s.revenue));
                  const percentage = maxRevenue > 0 ? (stat.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={stat.month} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{stat.month}</span>
                        <span className="font-medium">{formatCurrency(stat.revenue)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 方案收益排行 */}
          {revenueData.solutionStats.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-4">方案收益排行</h4>
              <div className="space-y-2">
                {revenueData.solutionStats
                  .sort((a, b) => b.revenue - a.revenue)
                  .slice(0, 5)
                  .map((stat, index) => (
                    <div
                      key={stat.solutionId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{stat.title}</div>
                          <div className="text-xs text-gray-500">{stat.count} 笔交易</div>
                        </div>
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(stat.revenue)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 最近交易 */}
          {revenueData.recentTransactions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-4">最近交易</h4>
              <div className="space-y-2">
                {revenueData.recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {transaction.solutionTitle}
                      </div>
                      <div className="text-xs text-gray-500">
                        订单号: {transaction.orderNumber || 'N/A'} |{' '}
                        {new Date(transaction.createdAt).toLocaleDateString('zh-CN')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(transaction.revenue)}
                      </div>
                      <div className="text-xs text-gray-500">
                        平台费: {formatCurrency(transaction.platformFee)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


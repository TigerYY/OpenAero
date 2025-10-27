'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface ReviewStats {
  overview: {
    totalReviews: number;
    completedReviews: number;
    pendingReviews: number;
    inProgressReviews: number;
    approvedReviews: number;
    rejectedReviews: number;
    overdueReviews: number;
    approvalRate: string;
    averageReviewTime: number;
  };
  reviewerStats: Array<{
    reviewerId: string;
    reviewerName: string;
    reviewerEmail: string;
    totalReviews: number;
    completedReviews: number;
    averageReviewTime: number;
  }>;
  trendData: Array<{
    date: string;
    count: number;
  }>;
  categoryDistribution: Array<{
    category: string;
    count: number;
    percentage: string;
  }>;
  period: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export default function ReviewStatsPage() {
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [selectedReviewer, setSelectedReviewer] = useState('');

  const loadStats = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        period,
        ...(selectedReviewer && { reviewerId: selectedReviewer }),
      });

      const response = await fetch(`/api/admin/review-stats?${params}`);
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      } else {
        console.error('获取统计数据失败:', data.error);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [period, selectedReviewer]);

  const formatDuration = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">加载统计数据中...</div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">加载统计数据失败</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题和控制 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">审核统计报表</h1>
          <p className="text-gray-600 mt-2">
            统计周期: {stats.dateRange.startDate.split('T')[0]} 至 {stats.dateRange.endDate.split('T')[0]}
          </p>
        </div>
        
        <div className="flex space-x-4">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="day">今日</option>
            <option value="week">本周</option>
            <option value="month">本月</option>
            <option value="year">本年</option>
          </select>
          
          <select
            value={selectedReviewer}
            onChange={(e) => setSelectedReviewer(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">所有审核员</option>
            {stats.reviewerStats.map((reviewer) => (
              <option key={reviewer.reviewerId} value={reviewer.reviewerId}>
                {reviewer.reviewerName}
              </option>
            ))}
          </select>
          
          <Button onClick={loadStats} variant="outline">
            刷新数据
          </Button>
        </div>
      </div>

      {/* 总体统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">总审核数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.totalReviews}</div>
            <div className="text-xs text-gray-500 mt-1">
              完成 {stats.overview.completedReviews} | 进行中 {stats.overview.inProgressReviews}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">通过率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.overview.approvalRate}%</div>
            <div className="text-xs text-gray-500 mt-1">
              通过 {stats.overview.approvedReviews} | 拒绝 {stats.overview.rejectedReviews}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">平均审核时间</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.averageReviewTime}h</div>
            <div className="text-xs text-gray-500 mt-1">
              基于已完成的审核
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">逾期审核</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overview.overdueReviews}</div>
            <div className="text-xs text-gray-500 mt-1">
              超过3天未完成
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 审核员效率统计 */}
      <Card>
        <CardHeader>
          <CardTitle>审核员效率统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">审核员</th>
                  <th className="text-left py-3 px-4">总审核数</th>
                  <th className="text-left py-3 px-4">已完成</th>
                  <th className="text-left py-3 px-4">平均用时</th>
                  <th className="text-left py-3 px-4">效率评级</th>
                </tr>
              </thead>
              <tbody>
                {stats.reviewerStats.map((reviewer) => {
                  const efficiency = reviewer.completedReviews > 0 
                    ? reviewer.averageReviewTime / (1000 * 60 * 60) // 转换为小时
                    : 0;
                  
                  let efficiencyBadge;
                  if (efficiency <= 24) {
                    efficiencyBadge = <Badge className="bg-green-100 text-green-800">高效</Badge>;
                  } else if (efficiency <= 48) {
                    efficiencyBadge = <Badge className="bg-yellow-100 text-yellow-800">一般</Badge>;
                  } else {
                    efficiencyBadge = <Badge className="bg-red-100 text-red-800">较慢</Badge>;
                  }

                  return (
                    <tr key={reviewer.reviewerId} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{reviewer.reviewerName}</div>
                          <div className="text-sm text-gray-500">{reviewer.reviewerEmail}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">{reviewer.totalReviews}</td>
                      <td className="py-3 px-4">{reviewer.completedReviews}</td>
                      <td className="py-3 px-4">
                        {reviewer.completedReviews > 0 
                          ? `${Math.round(efficiency)}h`
                          : '-'
                        }
                      </td>
                      <td className="py-3 px-4">{efficiencyBadge}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 方案类别分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>方案类别分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.categoryDistribution.map((category) => (
                <div key={category.category} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span className="font-medium">{category.category}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{category.count}</div>
                    <div className="text-sm text-gray-500">{category.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 审核趋势 */}
        <Card>
          <CardHeader>
            <CardTitle>审核趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.trendData.slice(-7).map((trend) => (
                <div key={trend.date} className="flex items-center justify-between py-2">
                  <span className="text-sm">{trend.date}</span>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="bg-blue-500 h-2 rounded"
                      style={{ 
                        width: `${Math.max(trend.count * 10, 10)}px`,
                        maxWidth: '100px'
                      }}
                    ></div>
                    <span className="text-sm font-medium w-8 text-right">{trend.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 状态分布饼图（简化版） */}
      <Card>
        <CardHeader>
          <CardTitle>审核状态分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.overview.pendingReviews}</div>
              <div className="text-sm text-gray-600">待审核</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.overview.inProgressReviews}</div>
              <div className="text-sm text-gray-600">审核中</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.overview.approvedReviews}</div>
              <div className="text-sm text-gray-600">已通过</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.overview.rejectedReviews}</div>
              <div className="text-sm text-gray-600">已拒绝</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
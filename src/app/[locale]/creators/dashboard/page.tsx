'use client';
import { useRouting } from '@/lib/routing';

import { 
  TrendingUp, 
  DollarSign, 
  FileText, 
  ShoppingCart,
  Eye,
  Star,
  Calendar,
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';


import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import ErrorMessage from '@/components/ui/ErrorMessage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import RevenueChart from '@/components/creators/RevenueChart';
import SolutionsList from '@/components/creators/SolutionsList';
import { DefaultLayout } from '@/components/layout/DefaultLayout';

import { formatCurrency, formatDate } from '@/lib/utils';


interface CreatorStats {
  totalSolutions: number;
  publishedSolutions: number;
  draftSolutions: number;
  pendingSolutions: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalOrders: number;
  monthlyOrders: number;
  totalViews: number;
  averageRating: number;
  totalDownloads?: number;
  totalReviews?: number;
}

interface RecentSolution {
  id: string;
  title: string;
  status: string;
  price: number;
  createdAt: string;
  updatedAt: string;
  viewCount?: number;
  downloadCount?: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  solutionTitle?: string;
  amount?: number;
  solutions: Array<{
    id: string;
    title: string;
    price: number;
  }>;
}

export default function CreatorDashboardPage() {
  const router = useRouter();
  const { route } = useRouting();
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [recentSolutions, setRecentSolutions] = useState<RecentSolution[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 获取统计数据
      const statsResponse = await fetch('/api/creators/dashboard/stats', {
        credentials: 'include',
      });
      const statsData = await statsResponse.json();
      if (statsData.success) {
        setStats(statsData.data);
      } else {
        console.error('获取统计数据失败:', statsData);
        setError(statsData.error || statsData.message || '获取统计数据失败');
      }

      // 获取最近的方案
      const solutionsResponse = await fetch('/api/creators/dashboard/recent-solutions');
      const solutionsData = await solutionsResponse.json();
      if (solutionsData.success) {
        setRecentSolutions(solutionsData.data);
      }

      // 获取最近的订单
      const ordersResponse = await fetch('/api/creators/dashboard/recent-orders');
      const ordersData = await ordersResponse.json();
      if (ordersData.success) {
        setRecentOrders(ordersData.data);
      }
    } catch (error) {
      console.error('获取仪表盘数据失败:', error);
      setError('网络错误，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <DefaultLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" message="加载仪表盘数据..." />
        </div>
      </DefaultLayout>
    );
  }

  if (error && !stats) {
    return (
      <DefaultLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <ErrorMessage error={error} className="mb-4" />
            <Button onClick={fetchDashboardData} variant="outline">
              重新加载
            </Button>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return '已发布';
      case 'PENDING': return '审核中';
      case 'DRAFT': return '草稿';
      case 'REJECTED': return '已拒绝';
      default: return status;
    }
  };

  return (
    <DefaultLayout>
      <div className="bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">创作者仪表板</h1>
          <p className="mt-2 text-sm text-gray-600">
            这里是您的创作管理中心。
          </p>
        </div>

        {error && <ErrorMessage error={error} className="mb-6" />}

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">总收益</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatCurrency(stats.totalRevenue)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      本月: {formatCurrency(stats.monthlyRevenue)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">方案总数</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {stats.totalSolutions}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      已发布: {stats.publishedSolutions}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">总订单</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {stats.totalOrders}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      本月: {stats.monthlyOrders}
                    </p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">平均评分</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      评价数: {stats.totalReviews || 0}
                    </p>
                  </div>
                  <Star className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 标签页内容 */}
        <Tabs defaultValue={searchParams?.get('tab') || 'overview'} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="revenue">收益</TabsTrigger>
            <TabsTrigger value="solutions">方案</TabsTrigger>
            <TabsTrigger value="orders">订单</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* 最近方案 */}
            {recentSolutions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>最近方案</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentSolutions.slice(0, 5).map((solution) => (
                      <div
                        key={solution.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                      >
                        <div>
                          <h4 className="font-medium text-gray-900">{solution.title}</h4>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span>{getStatusText(solution.status)}</span>
                            <span>{formatCurrency(solution.price)}</span>
                            <span>{formatDate(solution.updatedAt)}</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          查看
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 最近订单 */}
            {recentOrders.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>最近订单</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentOrders.slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                      >
                        <div>
                          <h4 className="font-medium text-gray-900">
                            订单号: {order.orderNumber}
                          </h4>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <Badge className={getStatusColor(order.status)}>
                              {getStatusText(order.status)}
                            </Badge>
                            <span>{formatCurrency(order.totalAmount)}</span>
                            <span>{formatDate(order.createdAt)}</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          查看
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            {stats && <RevenueChart creatorId={stats.totalSolutions.toString()} />}
          </TabsContent>

          <TabsContent value="solutions" className="space-y-6">
            <SolutionsList showHeader={false} />
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            {recentOrders.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>订单列表</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            订单号: {order.orderNumber}
                          </h4>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <Badge className={getStatusColor(order.status)}>
                              {getStatusText(order.status)}
                            </Badge>
                            <span>总额: {formatCurrency(order.totalAmount)}</span>
                            <span>{formatDate(order.createdAt)}</span>
                          </div>
                          {order.solutions.length > 0 && (
                            <div className="mt-2 text-sm text-gray-600">
                              方案: {order.solutions.map((s) => s.title).join(', ')}
                            </div>
                          )}
                        </div>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          查看详情
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12 text-gray-500">
                    <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p>暂无订单</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </DefaultLayout>
  );
}
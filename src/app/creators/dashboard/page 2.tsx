'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { formatCurrency, formatDate } from '@/lib/utils';

interface CreatorStats {
  totalSolutions: number;
  publishedSolutions: number;
  draftSolutions: number;
  pendingSolutions: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalViews: number;
  totalDownloads: number;
  averageRating: number;
  totalReviews: number;
}

interface RecentSolution {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  viewCount: number;
  downloadCount: number;
  price: number;
}

interface RecentOrder {
  id: string;
  solutionTitle: string;
  amount: number;
  createdAt: string;
  status: string;
}

export default function CreatorDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [recentSolutions, setRecentSolutions] = useState<RecentSolution[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user) {
      router.push('/auth/login');
      return;
    }

    // 检查用户是否为创作者
    if (session.user.role !== 'CREATOR') {
      router.push('/creators/apply');
      return;
    }

    fetchDashboardData();
  }, [session, status, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 获取统计数据
      const statsResponse = await fetch('/api/creators/dashboard/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      }

      // 获取最近的方案
      const solutionsResponse = await fetch('/api/creators/dashboard/recent-solutions');
      if (solutionsResponse.ok) {
        const solutionsData = await solutionsResponse.json();
        setRecentSolutions(solutionsData.data);
      }

      // 获取最近的订单
      const ordersResponse = await fetch('/api/creators/dashboard/recent-orders');
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setRecentOrders(ordersData.data);
      }
    } catch (error) {
      console.error('获取仪表盘数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== 'CREATOR') {
    return null;
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">创作者仪表盘</h1>
          <p className="mt-2 text-gray-600">管理您的方案和收益</p>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">总方案数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{stats.totalSolutions}</div>
                <p className="text-xs text-gray-500 mt-1">
                  已发布: {stats.publishedSolutions} | 草稿: {stats.draftSolutions}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">总收益</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</div>
                <p className="text-xs text-gray-500 mt-1">
                  本月: {formatCurrency(stats.monthlyRevenue)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">总浏览量</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.totalViews.toLocaleString()}</div>
                <p className="text-xs text-gray-500 mt-1">
                  下载: {stats.totalDownloads.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">平均评分</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.averageRating.toFixed(1)}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.totalReviews} 条评价
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 快速操作 */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-4">
            <Link href="/solutions/create">
              <Button className="bg-blue-600 hover:bg-blue-700">
                创建新方案
              </Button>
            </Link>
            <Link href="/solutions/manage">
              <Button variant="outline">
                管理方案
              </Button>
            </Link>
            <Link href="/creators/revenue">
              <Button variant="outline">
                收益管理
              </Button>
            </Link>
          </div>
        </div>

        {/* 主要内容区域 */}
        <Tabs defaultValue="solutions" className="space-y-6">
          <TabsList>
            <TabsTrigger value="solutions">最近方案</TabsTrigger>
            <TabsTrigger value="orders">最近订单</TabsTrigger>
            <TabsTrigger value="analytics">数据分析</TabsTrigger>
          </TabsList>

          <TabsContent value="solutions">
            <Card>
              <CardHeader>
                <CardTitle>最近方案</CardTitle>
              </CardHeader>
              <CardContent>
                {recentSolutions.length > 0 ? (
                  <div className="space-y-4">
                    {recentSolutions.map((solution) => (
                      <div key={solution.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{solution.title}</h3>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span>创建: {formatDate(solution.createdAt)}</span>
                            <span>浏览: {solution.viewCount}</span>
                            <span>下载: {solution.downloadCount}</span>
                            <span>价格: {formatCurrency(solution.price)}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge className={getStatusColor(solution.status)}>
                            {getStatusText(solution.status)}
                          </Badge>
                          <Link href={`/solutions/${solution.id}/edit`}>
                            <Button variant="outline" size="sm">
                              编辑
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">还没有创建任何方案</p>
                    <Link href="/solutions/create">
                      <Button>创建第一个方案</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>最近订单</CardTitle>
              </CardHeader>
              <CardContent>
                {recentOrders.length > 0 ? (
                  <div className="space-y-4">
                    {recentOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{order.solutionTitle}</h3>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span>订单时间: {formatDate(order.createdAt)}</span>
                            <span>金额: {formatCurrency(order.amount)}</span>
                          </div>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusText(order.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">暂无订单记录</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>数据分析</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">数据分析功能即将上线</p>
                  <p className="text-sm text-gray-400">敬请期待更详细的数据分析和趋势图表</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
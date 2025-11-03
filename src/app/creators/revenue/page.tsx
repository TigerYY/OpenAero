'use client';

import { 
  DollarSign, 
  TrendingUp, 
  Download, 
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { formatCurrency, formatDate } from '@/lib/utils';

interface RevenueShare {
  id: string;
  totalAmount: number;
  platformFee: number;
  creatorRevenue: number;
  status: 'PENDING' | 'SETTLED' | 'WITHDRAWN' | 'CANCELLED';
  settledAt?: string;
  withdrawnAt?: string;
  withdrawMethod?: string;
  withdrawAccount?: string;
  createdAt: string;
  order: {
    id: string;
    orderNumber: string;
    createdAt: string;
  };
  solution: {
    id: string;
    title: string;
    price: number;
  };
}

interface RevenueStats {
  totalRevenue: number;
  totalOrders: number;
  totalPlatformFee: number;
  statusBreakdown: Record<string, { count: number; revenue: number }>;
}

interface RevenueData {
  revenueShares: RevenueShare[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: RevenueStats;
  profile: {
    totalRevenue: number;
  };
}

const statusConfig = {
  PENDING: { label: '待结算', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  SETTLED: { label: '已结算', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  WITHDRAWN: { label: '已提现', color: 'bg-blue-100 text-blue-800', icon: Download },
  CANCELLED: { label: '已取消', color: 'bg-red-100 text-red-800', icon: AlertCircle },
};

export default function RevenuePage() {
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchRevenueData();
  }, [currentPage]);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/revenue?page=${currentPage}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('获取收益数据失败');
      }

      const result = await response.json();
      setRevenueData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取收益数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    // TODO: 实现提现功能
    console.log('提现功能待实现');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">加载中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  if (!revenueData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">暂无收益数据</div>
        </div>
      </div>
    );
  }

  const { revenueShares, stats, profile } = revenueData;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">收益中心</h1>
        <p className="text-gray-600">管理您的创作收益和提现申请</p>
      </div>

      {/* 收益概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总收益</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              累计收益金额
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">可提现余额</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(profile.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              当前可提现金额
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">订单数量</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              总订单数量
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平台费用</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPlatformFee)}</div>
            <p className="text-xs text-muted-foreground">
              平台服务费 (5%)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容区域 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview">收益概览</TabsTrigger>
            <TabsTrigger value="history">收益记录</TabsTrigger>
            <TabsTrigger value="withdraw">提现管理</TabsTrigger>
          </TabsList>

          {activeTab === 'overview' && (
            <Button onClick={handleWithdraw} className="ml-auto">
              <Download className="h-4 w-4 mr-2" />
              申请提现
            </Button>
          )}
        </div>

        <TabsContent value="overview" className="space-y-6">
          {/* 状态统计 */}
          <Card>
            <CardHeader>
              <CardTitle>收益状态分布</CardTitle>
              <CardDescription>按状态查看收益分布情况</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.statusBreakdown).map(([status, data]) => {
                  const config = statusConfig[status as keyof typeof statusConfig];
                  const Icon = config?.icon || Clock;
                  
                  return (
                    <div key={status} className="text-center p-4 border rounded-lg">
                      <Icon className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                      <div className="text-lg font-semibold">{formatCurrency(data.revenue)}</div>
                      <div className="text-sm text-gray-600">{data.count} 笔</div>
                      <Badge className={`mt-2 ${config?.color || 'bg-gray-100 text-gray-800'}`}>
                        {config?.label || status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>收益记录</CardTitle>
              <CardDescription>查看详细的收益分成记录</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {revenueShares.map((revenue) => {
                  const config = statusConfig[revenue.status];
                  const Icon = config?.icon || Clock;
                  
                  return (
                    <div key={revenue.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Icon className="h-5 w-5 text-gray-600" />
                        <div>
                          <div className="font-medium">{revenue.solution.title}</div>
                          <div className="text-sm text-gray-600">
                            订单号: {revenue.order.orderNumber}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatDate(revenue.createdAt)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(revenue.creatorRevenue)}</div>
                        <div className="text-sm text-gray-600">
                          总额: {formatCurrency(revenue.totalAmount)}
                        </div>
                        <Badge className={`mt-1 ${config?.color || 'bg-gray-100 text-gray-800'}`}>
                          {config?.label || revenue.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 分页 */}
              {revenueData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    上一页
                  </Button>
                  <span className="text-sm text-gray-600">
                    第 {currentPage} 页，共 {revenueData.pagination.totalPages} 页
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(revenueData.pagination.totalPages, currentPage + 1))}
                    disabled={currentPage === revenueData.pagination.totalPages}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdraw" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>提现管理</CardTitle>
              <CardDescription>申请提现和查看提现记录</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">提现功能</h3>
                <p className="text-gray-600 mb-4">
                  当前可提现余额: {formatCurrency(profile.totalRevenue)}
                </p>
                <Button onClick={handleWithdraw}>
                  <Download className="h-4 w-4 mr-2" />
                  申请提现
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
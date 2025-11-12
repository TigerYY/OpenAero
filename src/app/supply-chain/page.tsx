'use client';
import { useRouting } from '@/lib/routing';

import { 
  Factory, 
  Package, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  DollarSign,
  Users,
  Calendar,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency, formatDate } from '@/lib/utils';


interface DashboardStats {
  factories: {
    total: number;
    active: number;
    inactive: number;
  };
  sampleOrders: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
  costs: {
    totalEstimated: number;
    totalActual: number;
    avgOrderValue: number;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    factory: { name: string };
    solution: { title: string };
    status: string;
    quantity: number;
    deadline?: string;
    estimatedCost?: number;
  }>;
}

const STATUS_MAP = {
  PENDING: { label: '待确认', color: 'bg-yellow-100 text-yellow-800' },
  CONFIRMED: { label: '已确认', color: 'bg-blue-100 text-blue-800' },
  IN_PROGRESS: { label: '生产中', color: 'bg-purple-100 text-purple-800' },
  COMPLETED: { label: '已完成', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: '已取消', color: 'bg-gray-100 text-gray-800' },
};

export default function SupplyChainDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const { route } = useRouting()
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // 获取工厂统计
      const factoriesResponse = await fetch('/api/factories');
      const factories = await factoriesResponse.json();
      
      // 获取试产订单统计
      const ordersResponse = await fetch('/api/sample-orders?limit=100');
      const ordersData = await ordersResponse.json();
      const orders = ordersData.orders || [];
      
      // 计算统计数据
      const factoryStats = {
        total: factories.length,
        active: factories.filter((f: any) => f.status === 'ACTIVE').length,
        inactive: factories.filter((f: any) => f.status === 'INACTIVE').length,
      };
      
      const orderStats = {
        total: orders.length,
        pending: orders.filter((o: any) => o.status === 'PENDING').length,
        inProgress: orders.filter((o: any) => ['CONFIRMED', 'IN_PROGRESS'].includes(o.status)).length,
        completed: orders.filter((o: any) => o.status === 'COMPLETED').length,
        cancelled: orders.filter((o: any) => o.status === 'CANCELLED').length,
      };
      
      const totalEstimated = orders.reduce((sum: number, o: any) => sum + (o.estimatedCost || 0), 0);
      const totalActual = orders.reduce((sum: number, o: any) => sum + (o.actualCost || 0), 0);
      const avgOrderValue = orders.length > 0 ? totalEstimated / orders.length : 0;
      
      const costStats = {
        totalEstimated,
        totalActual,
        avgOrderValue,
      };
      
      // 获取最近的订单
      const recentOrders = orders
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
      
      setStats({
        factories: factoryStats,
        sampleOrders: orderStats,
        costs: costStats,
        recentOrders,
      });
    } catch (error) {
      console.error('获取仪表盘数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">加载仪表盘数据失败</p>
          <Button onClick={fetchDashboardStats} className="mt-4">
            重试
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">供应链管理</h1>
          <p className="text-gray-600 mt-1">工厂管理和试产订单概览</p>
        </div>
        <div className="flex gap-3">
          <Link href={route('/supply-chain/factories')}>
            <Button variant="outline">
              <Factory className="w-4 h-4 mr-2" />
              工厂管理
            </Button>
          </Link>
          <Link href={route('/supply-chain/sample-orders')}>
            <Button>
              <Package className="w-4 h-4 mr-2" />
              试产订单
            </Button>
          </Link>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 工厂统计 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">合作工厂</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.factories.total}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span className="text-green-600">活跃: {stats.factories.active}</span>
              <span className="text-gray-500">停用: {stats.factories.inactive}</span>
            </div>
          </CardContent>
        </Card>

        {/* 订单统计 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">试产订单</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sampleOrders.total}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span className="text-yellow-600">待确认: {stats.sampleOrders.pending}</span>
              <span className="text-blue-600">进行中: {stats.sampleOrders.inProgress}</span>
            </div>
          </CardContent>
        </Card>

        {/* 完成率 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">完成率</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.sampleOrders.total > 0 
                ? Math.round((stats.sampleOrders.completed / stats.sampleOrders.total) * 100)
                : 0}%
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span className="text-green-600">已完成: {stats.sampleOrders.completed}</span>
              <span className="text-gray-500">已取消: {stats.sampleOrders.cancelled}</span>
            </div>
          </CardContent>
        </Card>

        {/* 成本统计 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均订单价值</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.costs.avgOrderValue)}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span>预估总额: {formatCurrency(stats.costs.totalEstimated)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近订单 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              最近订单
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  暂无订单数据
                </div>
              ) : (
                stats.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{order.orderNumber}</span>
                        <Badge className={STATUS_MAP[order.status as keyof typeof STATUS_MAP]?.color}>
                          {STATUS_MAP[order.status as keyof typeof STATUS_MAP]?.label}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div>{order.factory.name}</div>
                        <div className="truncate">{order.solution.title}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{order.quantity} 件</div>
                      {order.estimatedCost && (
                        <div className="text-sm text-gray-600">
                          {formatCurrency(order.estimatedCost)}
                        </div>
                      )}
                      {order.deadline && (
                        <div className="text-xs text-gray-500">
                          {formatDate(order.deadline)}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            {stats.recentOrders.length > 0 && (
              <div className="mt-4 text-center">
                <Link href={route('/supply-chain/sample-orders')}>
                  <Button variant="outline" size="sm">
                    查看全部订单
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 状态分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              订单状态分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(STATUS_MAP).map(([status, config]) => {
                const count = stats.sampleOrders[status.toLowerCase() as keyof typeof stats.sampleOrders] as number;
                const percentage = stats.sampleOrders.total > 0 
                  ? Math.round((count / stats.sampleOrders.total) * 100) 
                  : 0;
                
                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={config.color}>
                        {config.label}
                      </Badge>
                      <span className="text-sm text-gray-600">{count} 个</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-8">{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* 成本对比 */}
            <div className="mt-6 pt-4 border-t">
              <h4 className="font-medium mb-3">成本统计</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">预估总成本</span>
                  <span className="font-medium">{formatCurrency(stats.costs.totalEstimated)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">实际总成本</span>
                  <span className="font-medium">{formatCurrency(stats.costs.totalActual)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">成本差异</span>
                  <span className={`font-medium ${
                    stats.costs.totalActual > stats.costs.totalEstimated 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    {formatCurrency(stats.costs.totalActual - stats.costs.totalEstimated)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}